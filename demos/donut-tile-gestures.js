export const gestureModes = ['zipper', 'paint', 'spring'];

const fullTurn = Math.PI * 2;
const zipperDuration = .48;
const maxWinding = fullTurn * 1.5;
const minWinding = .25;
const brushRadius = 1.15;

export function createDonutTileGestures(size) {
  const middle = size / 2;
  const teeth = Array.from({ length: size }, () => ({ closed: false, start: -Infinity }));
  const painted = new Float32Array(size * size).fill(NaN);
  let mode, hasPaint = false, winding = 0, unwind = null, keyboardRelease = Infinity;

  function clearPaint() {
    painted.fill(NaN);
    hasPaint = false;
  }

  function reset() {
    for (const tooth of teeth) { tooth.closed = false; tooth.start = -Infinity; }
    clearPaint();
    winding = 0;
    unwind = null;
    keyboardRelease = Infinity;
  }

  function zip(from, to, elapsed) {
    const col = Math.floor(to.x);
    if (col === Math.floor(from.x) || Math.abs(to.y - middle) > 2) return;
    const closed = to.x > from.x;
    for (const index of [Math.floor(from.x), col]) {
      const tooth = teeth[index];
      if (tooth.closed !== closed) Object.assign(tooth, { closed, start: elapsed });
    }
  }

  function paint(from, to) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    for (let row = Math.max(0, Math.floor(to.y - brushRadius)); row <= Math.min(size - 1, Math.floor(to.y + brushRadius)); row++) {
      for (let col = Math.max(0, Math.floor(to.x - brushRadius)); col <= Math.min(size - 1, Math.floor(to.x + brushRadius)); col++) {
        if (Math.hypot(col + .5 - to.x, row + .5 - to.y) > brushRadius) continue;
        painted[row * size + col] = angle;
        hasPaint = true;
      }
    }
  }

  function addWinding(delta) {
    winding = Math.max(-maxWinding, Math.min(maxWinding, winding + delta));
  }

  function wind(from, to) {
    const radius = Math.hypot(to.x - middle, to.y - middle);
    const previousRadius = Math.hypot(from.x - middle, from.y - middle);
    if (Math.min(radius, previousRadius) < 3 || Math.max(radius, previousRadius) > 9.5) return;
    const cross = (from.x - middle) * (to.y - middle) - (from.y - middle) * (to.x - middle);
    const dot = (from.x - middle) * (to.x - middle) + (from.y - middle) * (to.y - middle);
    addWinding(Math.atan2(cross, dot));
  }

  function releaseSpring(elapsed) {
    if (Math.abs(winding) >= minWinding) {
      unwind = { direction: -Math.sign(winding), until: elapsed + 1 + 3 * Math.abs(winding) / maxWinding };
    }
    winding = 0;
    keyboardRelease = Infinity;
  }

  function move(from, to, elapsed) {
    if (!from) return;
    const handle = mode === 'zipper' ? zip : mode === 'paint' ? paint : wind;
    const dx = to.x - from.x, dy = to.y - from.y;
    const steps = Math.ceil(Math.hypot(dx, dy) * 4);
    let previous = from;
    for (let i = 1; i <= steps; i++) {
      const next = { x: from.x + dx * i / steps, y: from.y + dy * i / steps };
      handle(previous, next, elapsed);
      previous = next;
    }
  }

  return {
    select(next) { mode = next; reset(); },
    clearPaint,
    get animating() {
      if (mode === 'zipper') return teeth.some(({ start }) => start !== -Infinity);
      if (mode === 'paint') return hasPaint;
      return mode === 'spring' && (Math.abs(winding) >= minWinding || unwind !== null);
    },
    begin() {
      if (mode !== 'spring') return;
      winding = 0;
      unwind = null;
      keyboardRelease = Infinity;
    },
    move,
    end(elapsed, cancelled = false) {
      if (mode !== 'spring') return;
      if (cancelled) {
        winding = 0;
        keyboardRelease = Infinity;
      } else releaseSpring(elapsed);
    },
    key(from, to, key, elapsed) {
      if (mode === 'spring') {
        if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;
        unwind = null;
        addWinding(key === 'ArrowRight' ? Math.PI / 6 : -Math.PI / 6);
        keyboardRelease = elapsed + .5;
      } else {
        move(from, to, elapsed);
      }
    },
    expire(elapsed) {
      if (mode === 'zipper') {
        for (const tooth of teeth) if (elapsed - tooth.start >= zipperDuration) tooth.start = -Infinity;
      }
      if (elapsed >= keyboardRelease) releaseSpring(elapsed);
      if (unwind && elapsed >= unwind.until) unwind = null;
    },
    tile(col, row, elapsed) {
      const x = col + .5, y = row + .5;
      if (mode === 'zipper') {
        if (Math.abs(y - middle) > 2) return null;
        const { closed, start } = teeth[col];
        const gain = Math.max(0, 1 - (elapsed - start) / zipperDuration) * (Math.abs(y - middle) < 1 ? 1 : .65);
        const towardSeam = y < middle ? Math.PI / 2 : -Math.PI / 2;
        return { closed, gain, angle: towardSeam + (closed ? 0 : Math.PI), start };
      }

      if (mode === 'paint') {
        const angle = painted[row * size + col];
        return Number.isFinite(angle) ? { gain: 1, angle } : null;
      }

      if (mode === 'spring') {
        const direction = unwind?.direction ?? (Math.abs(winding) >= minWinding ? Math.sign(winding) : 0);
        const radius = Math.hypot(x - middle, y - middle);
        if (!direction || radius < 5.3 || radius > 7.6) return null;
        return { gain: 1, angle: Math.atan2(y - middle, x - middle) + direction * Math.PI / 2 };
      }

      return null;
    },
    guide(ctx, left, top, cell) {
      if (mode !== 'spring') return;
      ctx.fillStyle = '#f4f1e8';
      ctx.beginPath();
      ctx.arc(left + middle * cell, top + middle * cell, 3, 0, fullTurn);
      ctx.fill();
    },
  };
}
