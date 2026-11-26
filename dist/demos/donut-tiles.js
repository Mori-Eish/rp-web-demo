import { localizeDemo, t } from '../i18n.js';
import { createDonutTileGestures, gestureModes } from './donut-tile-gestures.js';
import { squareLuminances } from './perpetual-square.js';

const columns = 20;
const fullTurn = Math.PI * 2;
const sectorAngle = fullTurn / 16;
const sectorOrigin = -Math.PI / 2;
const radiusRatio = .39;
const innerRadiusRatio = .6;
const edgeRatio = .18;
const frequency = 2;
// 盤面に対する反応範囲をタイル単位に換算する。
const reach = columns * .325;
const tapDuration = .28;
const releaseFade = .16;
const background = '#737373';
const idleShade = 173;
const gray = Array.from({ length: 256 }, (_, value) => `rgb(${value},${value},${value})`);

const patterns = [
  { value: 'split', labelKey: 'donutTiles.pattern.split' },
  { value: 'vortex', labelKey: 'donutTiles.pattern.vortex' },
  ...gestureModes.map((value) => ({ value, labelKey: `donutTiles.pattern.${value}` })),
];

function strokeArc(ctx, x, y, radius, width, color, start = 0, sweep = fullTurn) {
  ctx.beginPath();
  ctx.arc(x, y, radius, start, start + sweep);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function drawRP(ctx, x, y, cell, gain, phase, reverseAngle, showEdges) {
  const radius = cell * radiusRatio;
  const inner = radius * innerRadiusRatio;
  const thickness = radius - inner;
  const shade = (value) => gray[Math.round(idleShade + (value * 255 - idleShade) * gain)];
  const coreColor = shade(phase.center);
  // 下に描いた待機リングを消し、アンチエイリアスの明るい縁が残らないようにする。
  ctx.fillStyle = background;
  ctx.fillRect(x - cell / 2, y - cell / 2, cell, cell);
  strokeArc(ctx, x, y, (inner + radius) / 2, thickness, coreColor);
  if (!showEdges) return;

  const edge = thickness * edgeRatio * gain;
  const innerColor = shade(phase.bottom), outerColor = shade(phase.top);
  const innerEdge = inner + edge / 2, outerEdge = radius - edge / 2;
  if (reverseAngle === null) {
    if (innerColor !== coreColor) strokeArc(ctx, x, y, innerEdge, edge, innerColor);
    if (outerColor !== coreColor) strokeArc(ctx, x, y, outerEdge, edge, outerColor);
    return;
  }

  // 各区画の中心で反転を判定。反転した半円では内側と外側の輝度を交換する。
  const start = sectorOrigin + Math.round((reverseAngle - Math.PI / 2 - sectorOrigin) / sectorAngle) * sectorAngle;
  if (outerColor !== coreColor) {
    strokeArc(ctx, x, y, innerEdge, edge, outerColor, start, Math.PI);
    strokeArc(ctx, x, y, outerEdge, edge, outerColor, start + Math.PI, Math.PI);
  }
  if (innerColor !== coreColor) {
    strokeArc(ctx, x, y, outerEdge, edge, innerColor, start, Math.PI);
    strokeArc(ctx, x, y, innerEdge, edge, innerColor, start + Math.PI, Math.PI);
  }
}

export const donutTiles = {
  id: 'donut-tiles',
  title: 'ドーナツRPタイル',
  description: '20×20のドーナツを押したままなぞり、見かけの動きを切り替えます。',
  note: '「半円反転」では、カーソルが輪の外にあると近い側の半円だけエッジの明暗を入れ替えます。輪の内側では全周が通常のRPになります。RPのエッジをオフにすると、反応した輪は全周が一様に明滅します。',
  badge: '試作',
  stageClass: 'bar-stage',
  stageLabel: `${columns} × ${columns}`,
  hint: 'クリック・タップ / 押したままなぞる / 矢印キー',
  canvasLabel: '20×20のドーナツ状RPタイル。クリック、タップ、ドラッグ、または矢印キーで反応する位置を選びます。',
  thumbnail: 'donut-tiles',
  settings: [
    { key: 'tilePattern', label: '動きのパターン', type: 'select', default: 'split', options: patterns },
    { key: 'donutTileEdges', label: 'RPのエッジを表示', type: 'checkbox', default: true },
  ],
  create({ canvas, overlay, invalidate, setHint, setNote }) {
    const ctx = canvas.getContext('2d');
    const idleLayer = document.createElement('canvas');
    const idleCtx = idleLayer.getContext('2d');
    if (!ctx || !idleCtx) throw new Error('Canvas 2D is unavailable');
    canvas.classList.add('donut-tiles-control');
    let width = 1, height = 1, cell = 1, side = columns, left = 0, top = 0;
    let pattern = 'split', elapsed = 0, dirty = true;
    let pointer = null, contact = null, showEdges = true;
    let keyX = columns / 2 + .5, keyY = columns / 2 + .5, showKeyboard = false;
    const gestures = createDonutTileGestures(columns);
    const clearPaint = document.createElement('button');
    clearPaint.type = 'button';
    clearPaint.className = 'button donut-tiles-action';
    clearPaint.hidden = true;
    clearPaint.addEventListener('click', () => {
      gestures.clearPaint();
      dirty = true;
      invalidate?.();
    });
    overlay.append(clearPaint);

    function localize() {
      const special = gestureModes.includes(pattern);
      setHint?.(t(`donutTiles.hint.${special ? pattern : 'default'}`));
      setNote?.(special ? t(`donutTiles.note.${pattern}`) : localizeDemo(donutTiles).note);
      clearPaint.hidden = pattern !== 'paint';
      clearPaint.textContent = t('donutTiles.clearPaint');
    }

    function emit(x, y, previous) {
      if (gestureModes.includes(pattern)) {
        gestures.move(previous, { x, y }, elapsed);
      } else {
        const start = contact?.release === Infinity ? contact.start : elapsed;
        contact = { x, y, start, release: Infinity };
      }
      dirty = true;
    }

    function release(cancelled = false) {
      if (pointer && gestureModes.includes(pattern)) gestures.end(elapsed, cancelled);
      pointer = null;
      if (contact?.release === Infinity) contact.release = Math.max(elapsed, contact.start + tapDuration);
      dirty = true;
    }

    function clear() {
      pointer = contact = null;
      gestures.select(pattern);
      dirty = true;
    }

    function drawGesture() {
      const phase = squareLuminances(elapsed * frequency, 'down', 1);
      for (let row = 0; row < columns; row++) {
        for (let col = 0; col < columns; col++) {
          const stimulus = gestures.tile(col, row, elapsed);
          if (!stimulus || (!stimulus.gain && !stimulus.closed)) continue;
          const x = left + (col + .5) * cell, y = top + (row + .5) * cell;
          if (stimulus.gain > 0) {
            const luminance = stimulus.start === undefined ? phase : squareLuminances((elapsed - stimulus.start) * frequency, 'down', 1);
            drawRP(ctx, x, y, cell, stimulus.gain, luminance, stimulus.angle, showEdges);
          } else {
            ctx.fillStyle = background;
            ctx.fillRect(x - cell / 2, y - cell / 2, cell, cell);
            strokeArc(ctx, x, y, cell * radiusRatio * (1 + innerRadiusRatio) / 2,
              cell * radiusRatio * (1 - innerRadiusRatio), gray[145]);
          }
        }
      }
      gestures.guide(ctx, left, top, cell);
    }

    function drawHeld(row, col, phase) {
      const dx = contact.x - (col + .5), dy = contact.y - (row + .5);
      const distance = Math.hypot(dx, dy);
      if (distance >= reach) return;
      const fade = Math.min(1, (contact.release + releaseFade - elapsed) / releaseFade);
      const proximity = 1 - Math.max(0, distance - radiusRatio) / (reach - radiusRatio);
      const angle = Math.atan2(dy, dx);
      let reverseAngle = angle;
      let luminances = phase;
      let gain = fade * proximity;
      if (pattern === 'split') {
        // Unityと同様、輪の外側にカーソルがあるときだけ半円を反転する。
        if (distance <= radiusRatio) reverseAngle = null;
      } else {
        reverseAngle -= Math.PI / 2;
        luminances = squareLuminances(elapsed * frequency - distance / columns * 3.8, 'down', 1);
        gain *= Math.min(1, distance / (columns * .0325));
      }
      if (gain <= 0) return;
      drawRP(ctx, left + (col + .5) * cell, top + (row + .5) * cell, cell, gain, luminances, reverseAngle, showEdges);
    }

    return {
      resize(view) {
        ({ width, height } = view);
        const dpr = view.dpr ?? 1;
        const available = Math.min(width - 24, height - 72);
        const cellPixels = Math.max(1, Math.floor(available * dpr / columns));
        cell = cellPixels / dpr;
        side = cell * columns;
        left = Math.round((width - side) * dpr / 2) / dpr;
        top = Math.round((height - side) * dpr / 2) / dpr;
        idleLayer.width = idleLayer.height = cellPixels * columns;
        idleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        idleCtx.fillStyle = background;
        idleCtx.fillRect(0, 0, side, side);
        const mid = cell * radiusRatio * (1 + innerRadiusRatio) / 2;
        idleCtx.beginPath();
        for (let row = 0; row < columns; row++) {
          for (let col = 0; col < columns; col++) {
            const x = (col + .5) * cell, y = (row + .5) * cell;
            idleCtx.moveTo(x + mid, y);
            idleCtx.arc(x, y, mid, 0, fullTurn);
          }
        }
        idleCtx.strokeStyle = gray[idleShade];
        idleCtx.lineWidth = cell * radiusRatio * (1 - innerRadiusRatio);
        idleCtx.stroke();
        dirty = true;
      },
      setSettings({ tilePattern, donutTileEdges }) {
        if (typeof donutTileEdges === 'boolean' && donutTileEdges !== showEdges) {
          showEdges = donutTileEdges;
          dirty = true;
        }
        if (tilePattern === pattern || !patterns.some(({ value }) => value === tilePattern)) return;
        pattern = tilePattern;
        clear();
        localize();
      },
      pointer({ type, x, y, pointerId }) {
        if (type === 'up' || type === 'cancel') {
          if (pointer?.id === pointerId) release(type === 'cancel');
          return;
        }
        const tx = (x - left) / cell, ty = (y - top) / cell;
        const inside = tx >= 0 && tx < columns && ty >= 0 && ty < columns;
        if (type === 'down' && !pointer && inside) {
          pointer = { id: pointerId, x: tx, y: ty };
          if (gestureModes.includes(pattern)) gestures.begin();
          showKeyboard = false;
          emit(tx, ty);
        } else if (type === 'move' && pointer?.id === pointerId) {
          if (!inside) {
            if (gestureModes.includes(pattern)) {
              pointer = { id: pointerId };
            }
            return;
          }
          const previous = Number.isFinite(pointer.x) ? pointer : null;
          pointer = { id: pointerId, x: tx, y: ty };
          emit(tx, ty, previous);
        }
      },
      key({ key }) {
        const offset = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[key];
        if (!offset) return;
        const previous = { x: keyX, y: keyY };
        keyX = Math.max(.5, Math.min(columns - .5, keyX + offset[0]));
        keyY = Math.max(.5, Math.min(columns - .5, keyY + offset[1]));
        showKeyboard = true;
        if (gestureModes.includes(pattern)) {
          if (!pointer) gestures.key(previous, { x: keyX, y: keyY }, key, elapsed);
          dirty = true;
        } else {
          emit(keyX, keyY, previous);
          release();
        }
      },
      suspend() { release(true); },
      localize,
      reset() {
        clear();
        elapsed = 0;
        keyX = keyY = columns / 2 + .5;
        showKeyboard = false;
        localize();
      },
      render(frame) {
        elapsed = frame.elapsed;
        if (!dirty && !contact && !gestures.animating) return;
        if (contact && elapsed >= contact.release + releaseFade) contact = null;
        gestures.expire(elapsed);

        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(idleLayer, left, top, side, side);
        if (gestureModes.includes(pattern)) {
          drawGesture();
        } else if (contact) {
          const phase = squareLuminances(elapsed * frequency, 'down', 1);
          for (let row = 0; row < columns; row++) {
            for (let col = 0; col < columns; col++) {
              drawHeld(row, col, phase);
            }
          }
        }
        if (showKeyboard) {
          ctx.strokeStyle = '#f8f8f3';
          ctx.lineWidth = 1;
          ctx.strokeRect(left + (keyX - .5) * cell, top + (keyY - .5) * cell, cell, cell);
        }
        dirty = false;
      },
      dispose() { canvas.classList.remove('donut-tiles-control'); },
    };
  },
};
