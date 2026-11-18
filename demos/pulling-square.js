import { t } from '../i18n.js';
import { squareLuminances } from './perpetual-square.js';

const turnDuration = 1;
const gray = (value) => {
  const byte = Math.round(value * 255);
  return `rgb(${byte},${byte},${byte})`;
};

function drawPerson(ctx, x, ground, size, facing, gait) {
  ctx.save();
  ctx.translate(x, ground);
  ctx.scale(size * facing, size);
  ctx.strokeStyle = '#282e29';
  ctx.lineWidth = .047;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#deddd3';
  ctx.beginPath();
  ctx.arc(.2, -1.28, .14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  // 後ろの紐を握り、体を進行方向へ傾けて後ずさりする姿勢。
  ctx.moveTo(.17, -1.12);
  ctx.lineTo(-.04, -.58);
  ctx.moveTo(.12, -.99);
  ctx.lineTo(-.08, -.79);
  ctx.lineTo(-.4, -.78);
  ctx.moveTo(.06, -.9);
  ctx.lineTo(-.13, -.68);
  ctx.lineTo(-.4, -.78);
  ctx.moveTo(-.04, -.58);
  ctx.lineTo(.11 + gait * .08, -.3);
  ctx.lineTo(.12 + gait * .28, -.035);
  ctx.lineTo(.23 + gait * .28, -.035);
  ctx.moveTo(-.04, -.58);
  ctx.lineTo(-.17 - gait * .08, -.3);
  ctx.lineTo(-.16 - gait * .28, -.035);
  ctx.lineTo(-.05 - gait * .28, -.035);
  ctx.stroke();
  ctx.restore();
}

export const pullingSquare = {
  id: 'pulling-square',
  title: '紐で四角を引っ張る',
  description: '棒人間が引っ張る2つの四角を、上下の段で比べます。',
  note: '上段は移動と同方向、下段は逆方向のRPです。移動速度、点滅の周期、紐の長さは共通です。端まで来ると棒人間が反対側へ回り、逆向きに引っ張ります。',
  badge: '試作',
  stageClass: 'bar-stage',
  stageLabel: 'PULL AND COMPARE',
  hint: '上下の四角の動きを見比べる · 一時停止で止められます',
  canvasLabel: '上下2段それぞれに地面、四角、紐、棒人間があります。上段は同方向RP、下段は逆方向RPで、同じ速さで自動往復します。',
  thumbnail: 'pulling',
  settings: [
    { key: 'autoSpeed', label: '自動移動の速度', type: 'range', min: 20, max: 150, step: 10, default: 50, unit: ' px/s' },
    { key: 'frequency', label: '周波数', type: 'range', min: .1, max: 4, step: .1, default: 2, unit: ' Hz' },
    { key: 'edgePercent', label: 'エッジ幅', type: 'range', min: .5, max: 20, step: .5, default: 2.5, unit: ' %' },
    { key: 'guides', label: 'ガイドを表示', type: 'checkbox', default: false },
  ],
  create({ canvas }) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable');
    const settings = Object.fromEntries(pullingSquare.settings.map(({ key, default: value }) => [key, value]));
    let width = 1, height = 1, size = 1, margin = 0, span = 0;
    let position = 0, direction = 1, turnTime = 0, walk = 0, cycles = 0;

    function advance(delta) {
      let remaining = delta;
      while (remaining > 0) {
        if (turnTime > 0) {
          const step = Math.min(remaining, turnTime);
          turnTime -= step;
          remaining -= step;
          if (turnTime === 0) direction *= -1;
        } else {
          const distance = (direction > 0 ? 1 - position : position) * span;
          const step = Math.min(remaining, distance / settings.autoSpeed);
          position = Math.max(0, Math.min(1, position + direction * settings.autoSpeed * step / span));
          walk += settings.autoSpeed * step / Math.max(1, size);
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
      },
      setSettings(values) {
        for (const { key, type, min, max } of pullingSquare.settings) {
          if (type === 'checkbox') {
            if (typeof values[key] === 'boolean') settings[key] = values[key];
          } else if (Number.isFinite(values[key])) settings[key] = Math.max(min, Math.min(max, values[key]));
        }
      },
      reset() {
        position = turnTime = walk = cycles = 0;
        direction = 1;
      },
      render({ delta = 0 }) {
        advance(Math.max(0, delta));
        cycles = (cycles + Math.max(0, delta) * settings.frequency) % 1;
        const turning = turnTime > 0;
        const turn = turning ? 1 - turnTime / turnDuration : 0;
        const eased = turn * turn * (3 - 2 * turn);
        const side = direction * (1 - eased * 2);
        const facing = turning && turn > .5 ? -direction : direction;
        const squareX = margin + position * span;
        const personX = squareX + side * size * 2;
        const gait = turning ? Math.sin(turn * Math.PI * 6) : Math.sin(walk * Math.PI * 2);
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, width, height);
        const rowTop = 38, rowHeight = Math.max(1, (height - rowTop - 36) / 2);
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

          const phase = squareLuminances(cycles, row === 0 ? movement : opposite, 1);
          const left = squareX - size / 2, top = ground - size;
          ctx.fillStyle = gray(phase.center);
          ctx.fillRect(left, top, size, size);
          const edge = size * settings.edgePercent / 100;
          ctx.fillStyle = gray(phase.left);
          ctx.fillRect(left, top, edge, size);
          ctx.fillStyle = gray(phase.right);
          ctx.fillRect(left + size - edge, top, edge, size);

          const anchorX = squareX + side * size / 2;
          const anchorY = ground - size * .55 - Math.sin(turn * Math.PI) * size * .45;
          const handX = personX - facing * size * .4;
          const handY = ground - size * .78;
          ctx.beginPath();
          ctx.moveTo(anchorX, anchorY);
          ctx.quadraticCurveTo((anchorX + handX) / 2, Math.max(anchorY, handY) + (turning ? size * .25 : size * .025), handX, handY);
          ctx.strokeStyle = '#dfcf9e';
          ctx.lineWidth = Math.max(1.5, size * .035);
          ctx.stroke();
          drawPerson(ctx, personX, ground, size, facing, gait);
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
    };
  },
};
