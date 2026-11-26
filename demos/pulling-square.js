import { t } from '../i18n.js';
import { squareLuminances } from './perpetual-square.js';

const turnDuration = 2.2;
const pullingModes = ['auto', 'manual'];
const strideLength = .96;
const stanceFraction = .62;
const ease = (progress) => progress * progress * (3 - 2 * progress);
const gray = (value) => {
  const byte = Math.round(value * 255);
  return `rgb(${byte},${byte},${byte})`;
};

function walkingFoot(phase) {
  const swing = Math.max(0, (phase - stanceFraction) / (1 - stanceFraction));
  const lift = .16 * Math.sin(swing * Math.PI) ** 2;
  // 体の移動分を打ち消して、接地中の足を地面の同じ位置に置く。
  return { x: strideLength * (stanceFraction / 2 - phase + ease(swing)), y: -.028 - lift, lift };
}

function walkingPose(walk, side, turningAmount) {
  const phase = ((walk / strideLength) % 1 + 1) % 1;
  const bob = -.024 * Math.cos(4 * Math.PI * (phase - stanceFraction / 2));
  return {
    hipX: -.035 * side,
    hipY: -.64 + bob,
    shoulderX: (.14 - .08 * turningAmount) * side,
    shoulderY: -.99 + bob,
    handX: -.42 * side,
    handY: -.78 - .25 * turningAmount + bob * .65,
    feet: [walkingFoot(phase), walkingFoot((phase + .5) % 1)],
  };
}

function drawLeg(ctx, hipX, hipY, foot, heading) {
  const dx = foot.x - hipX, dy = foot.y - hipY;
  const length = Math.hypot(dx, dy);
  const bend = Math.sqrt(Math.max(0, .36 ** 2 - (length / 2) ** 2)) * heading;
  ctx.moveTo(hipX, hipY);
  ctx.lineTo((hipX + foot.x) / 2 + bend * dy / length, (hipY + foot.y) / 2 - bend * dx / length);
  ctx.lineTo(foot.x, foot.y);
  ctx.lineTo(foot.x + .11 * heading, foot.y + foot.lift * .3);
}

function drawPerson(ctx, x, ground, size, side, turningAmount, pose) {
  const { hipX, hipY, shoulderX, shoulderY, handX, handY, feet } = pose;
  const headX = shoulderX + .045 * side;
  const headY = shoulderY - .255;
  ctx.save();
  ctx.translate(x, ground);
  ctx.scale(size, size);
  ctx.lineWidth = .047;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = '#444b42';
  ctx.beginPath();
  drawLeg(ctx, hipX, hipY, feet[0], -side);
  ctx.moveTo(shoulderX, shoulderY + .03);
  ctx.lineTo(-.15 * side, shoulderY + .31 - .14 * turningAmount);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  ctx.strokeStyle = '#282e29';
  ctx.beginPath();
  drawLeg(ctx, hipX, hipY, feet[1], -side);
  ctx.moveTo(headX, headY + .14);
  ctx.lineTo(shoulderX, shoulderY);
  ctx.lineTo(hipX, hipY);
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(-.07 * side, shoulderY + .22 - .14 * turningAmount);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  ctx.fillStyle = '#deddd3';
  ctx.beginPath();
  ctx.arc(headX, headY, .14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export const pullingSquare = {
  id: 'pulling-square',
  title: '紐で四角を引っ張る',
  description: '棒人間が引っ張る2つの四角を、上下の段で比べます。',
  note: '上段は移動と同方向、下段は逆方向のRPです。端まで来ると棒人間が反対側へ回り、逆向きに引っ張ります。手動モードでは「押して進む」を押している間だけ、移動とRPの点滅が進みます。',
  badge: '試作',
  stageClass: 'bar-stage',
  stageLabel: 'PULL AND COMPARE',
  hint: '上下の四角の動きを見比べる · 一時停止で止められます',
  canvasLabel: '上下2段それぞれに地面、四角、紐、棒人間があります。上段は同方向RP、下段は逆方向RPです。自動往復と、ボタンを押している間だけ進む手動モードがあります。',
  thumbnail: 'pulling',
  settings: [
    { key: 'pullingMode', label: '操作モード', type: 'select', default: 'auto',
      options: pullingModes.map(value => ({ value, labelKey: `pulling.mode.${value}` })) },
    { key: 'autoSpeed', label: '移動速度', labelKey: 'setting.pullingSpeed', type: 'range', min: 20, max: 150, step: 10, default: 50, unit: ' px/s' },
    { key: 'frequency', label: '周波数', type: 'range', min: .1, max: 4, step: .1, default: 2, unit: ' Hz' },
    { key: 'edgePercent', label: 'エッジ幅', type: 'range', min: .5, max: 20, step: .5, default: 2.5, unit: ' %' },
    { key: 'guides', label: 'ガイドを表示', type: 'checkbox', default: false },
  ],
  create({ canvas, overlay, start, setHint }) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable');
    const settings = Object.fromEntries(pullingSquare.settings.map(({ key, default: value }) => [key, value]));
    let width = 1, height = 1, size = 1, margin = 0, span = 0;
    let position = 0, direction = 1, turnTime = 0, walk = 0, cycles = 0;
    let heldBy = null, fullscreen = false;
    const holdButton = overlay ? document.createElement('button') : null;

    function release() {
      heldBy = null;
      if (holdButton) holdButton.dataset.holding = 'false';
    }

    function hold(input) {
      if (settings.pullingMode !== 'manual' || heldBy !== null) return false;
      heldBy = input;
      holdButton.dataset.holding = 'true';
      start?.();
      return true;
    }

    function localize() {
      const manual = settings.pullingMode === 'manual';
      if (holdButton) {
        holdButton.hidden = !manual;
        holdButton.textContent = t('pulling.hold');
      }
      setHint?.(t(manual ? 'pulling.hint.manual' : 'pulling.hint.auto'));
    }

    if (holdButton) {
      holdButton.type = 'button';
      holdButton.className = 'button button-dark pulling-hold';
      holdButton.addEventListener('pointerdown', event => {
        if (event.button === 0 && hold(event.pointerId)) holdButton.setPointerCapture(event.pointerId);
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        holdButton.addEventListener(type, event => { if (heldBy === event.pointerId) release(); });
      }
      for (const type of ['keydown', 'keyup']) {
        holdButton.addEventListener(type, event => {
          if (event.key !== ' ' && event.key !== 'Enter') return;
          event.preventDefault();
          if (type === 'keydown' && !event.repeat) hold(event.key);
          if (type === 'keyup' && heldBy === event.key) release();
        });
      }
      holdButton.addEventListener('blur', release);
      holdButton.addEventListener('contextmenu', event => event.preventDefault());
      overlay.append(holdButton);
    }
    localize();

    function advance(delta) {
      let remaining = delta;
      while (remaining > 0) {
        if (turnTime > 0) {
          const step = Math.min(remaining, turnTime);
          const previousTurn = ease(1 - turnTime / turnDuration);
          turnTime -= step;
          walk -= direction * 4 * (ease(1 - turnTime / turnDuration) - previousTurn);
          remaining -= step;
          if (turnTime === 0) direction *= -1;
        } else {
          const distance = (direction > 0 ? 1 - position : position) * span;
          const step = Math.min(remaining, distance / settings.autoSpeed);
          position = Math.max(0, Math.min(1, position + direction * settings.autoSpeed * step / span));
          walk += direction * settings.autoSpeed * step / size;
          remaining -= step;
          if (step >= distance / settings.autoSpeed) {
            position = direction > 0 ? 1 : 0;
            turnTime = turnDuration;
          }
        }
      }
    }

    return {
      resize(view) {
        width = Math.max(1, view.width);
        height = Math.max(1, view.height);
        size = Math.min(60, width * .12, height * .12);
        margin = size * 2.65 + 12;
        span = Math.max(1, width - margin * 2);
        fullscreen = canvas.parentElement?.matches(':fullscreen');
      },
      localize,
      setSettings(values) {
        for (const { key, type, min, max } of pullingSquare.settings) {
          if (type === 'checkbox') {
            if (typeof values[key] === 'boolean') settings[key] = values[key];
          } else if (type === 'select') {
            if (pullingModes.includes(values[key]) && settings[key] !== values[key]) {
              release();
              settings[key] = values[key];
              localize();
            }
          } else if (Number.isFinite(values[key])) settings[key] = Math.max(min, Math.min(max, values[key]));
        }
      },
      suspend: release,
      reset() {
        release();
        position = turnTime = walk = cycles = 0;
        direction = 1;
      },
      render({ delta = 0 }) {
        const manual = settings.pullingMode === 'manual';
        const step = !manual || heldBy !== null ? Math.max(0, delta) : 0;
        advance(step);
        cycles = (cycles + step * settings.frequency) % 1;
        const turn = turnTime > 0 ? 1 - turnTime / turnDuration : 0;
        const side = direction * (1 - 2 * ease(turn));
        const turningAmount = Math.sin(turn * Math.PI) ** 2;
        const squareX = margin + position * span;
        const personX = squareX + side * size * 2;
        const pose = walkingPose(walk, side, turningAmount);
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, width, height);
        const footer = manual ? (fullscreen ? 144 : 88) : 36;
        const rowTop = 38, rowHeight = Math.max(1, (height - rowTop - footer) / 2);
        ctx.font = `${Math.max(10, Math.min(12, width / 36))}px system-ui, sans-serif`;
        ctx.textAlign = 'left';
        const movement = direction > 0 ? 'right' : 'left';
        const opposite = direction > 0 ? 'left' : 'right';

        for (let row = 0; row < 2; row++) {
          const y = rowTop + row * rowHeight;
          const ground = y + rowHeight * .8;
          ctx.fillStyle = '#50564d';
          ctx.fillRect(0, ground, width, rowHeight * .2);
          ctx.fillStyle = '#b8b9a8';
          ctx.fillRect(0, ground, width, 1);
          ctx.fillStyle = '#232923';
          ctx.fillText(t(row === 0 ? 'pulling.same' : 'pulling.opposite'), 16, y + 16);

          const anchorX = squareX + side * size / 2;
          const anchorY = ground - size * (.55 + turningAmount * .45);
          const handX = personX + pose.handX * size;
          const handY = ground + pose.handY * size;
          const sag = size * (.03 + turningAmount * .24);
          ctx.beginPath();
          ctx.moveTo(anchorX, anchorY);
          ctx.quadraticCurveTo((anchorX + handX) / 2, (anchorY + handY) / 2 + sag, handX, handY);
          ctx.strokeStyle = '#dfcf9e';
          ctx.lineWidth = Math.max(1.5, size * .035);
          ctx.stroke();
          drawPerson(ctx, personX, ground, size, side, turningAmount, pose);

          const phase = squareLuminances(cycles, row === 0 ? movement : opposite, 1);
          const left = squareX - size / 2, top = ground - size;
          ctx.fillStyle = gray(phase.center);
          ctx.fillRect(left, top, size, size);
          const edge = size * settings.edgePercent / 100;
          ctx.fillStyle = gray(phase.left);
          ctx.fillRect(left, top, edge, size);
          ctx.fillStyle = gray(phase.right);
          ctx.fillRect(left + size - edge, top, edge, size);
        }

        if (settings.guides) {
          const fromY = rowTop + rowHeight * .8 + 6;
          const toY = rowTop + rowHeight * 1.8 - size - 6;
          ctx.save();
          ctx.strokeStyle = '#f4e3a7';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          for (const x of [squareX - size / 2, squareX + size / 2]) {
            ctx.moveTo(x, fromY);
            ctx.lineTo(x, toY);
          }
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath();
          for (const x of [squareX - size / 2, squareX + size / 2]) {
            ctx.moveTo(x - 4, fromY);
            ctx.lineTo(x + 4, fromY);
            ctx.moveTo(x - 4, toY);
            ctx.lineTo(x + 4, toY);
          }
          ctx.stroke();
          ctx.restore();
        }
      },
      dispose() { holdButton?.remove(); },
    };
  },
};
