import { squareLuminances } from './perpetual-square.js';

// 判定は四角形の中心。風の方向はユーザー確認済みのRP方向に対応させる。
export const windZones = Object.freeze([
  Object.freeze({ id: 'down', direction: 'down', left: .28, right: .46, top: .25, bottom: .76 }),
  Object.freeze({ id: 'up', direction: 'up', left: .59, right: .77, top: .25, bottom: .76 }),
]);

export function windZoneAt(x, y, width, height) {
  if (width <= 0 || height <= 0) return null;
  return windZones.find((zone) => x >= zone.left * width && x <= zone.right * width && y >= zone.top * height && y <= zone.bottom * height) || null;
}

export const fanWind = {
  id: 'fan-wind',
  title: 'ファンの風を受ける',
  description: 'ファンの間を通って、四角いカーソルを左から右へ動かしてみてください。',
  note: 'マウスを動かすと四角形が追従します。タッチはドラッグ、矢印キーでも操作できます。',
  kind: 'WIND EXPLORATION',
  badge: '体験デモ',
  stageLabel: 'WIND FIELD',
  stageClass: 'wind-stage',
  hint: '左から右へ · マウスを動かす / タッチでドラッグ / 矢印キー',
  canvasLabel: 'ファンの風デモの操作領域。マウス、タッチのドラッグ、矢印キーで四角形を左から右へ動かします。',
  thumbnail: 'wind',
  settings: [
    { key: 'frequency', label: '周波数', type: 'range', min: .1, max: 4, step: .1, default: 2, unit: ' Hz' },
    { key: 'cursorSize', label: 'カーソルサイズ', type: 'range', min: 24, max: 80, step: 2, default: 60, unit: ' px' },
    { key: 'edgePercent', label: 'エッジ幅', type: 'range', min: .5, max: 20, step: .5, default: 2.5, unit: ' %' },
  ],
  create({ canvas, setStageLabel }) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable');
    let width = 1, height = 1, x = .1, y = .5, touchId = null;
    let settings = Object.fromEntries(fanWind.settings.map((item) => [item.key, item.default]));
    let cycles = 0, lastElapsed = 0, zone = null;
    const cursorSize = () => Math.min(settings.cursorSize, Math.max(16, Math.min(width, height) - 32));
    const startX = () => Math.max(.1, (cursorSize() / 2 + 8) / width);
    const goalX = () => Math.min(.91, 1 - (cursorSize() / 2 + 8) / width);
    function refreshZone() {
      // エリアの内外で共通の点滅位相を保ち、境界ではエッジの有無だけを切り替える。
      zone = windZoneAt(x * width, y * height, width, height);
      setStageLabel?.(`WIND FIELD / ${settings.frequency.toFixed(1)} Hz`);
    }
    function constrain() {
      const margin = cursorSize() / 2 + 8;
      x = Math.max(margin / width, Math.min(1 - margin / width, x));
      y = Math.max(margin / height, Math.min(1 - margin / height, y));
      refreshZone();
    }
    function move(px, py) { x = px / width; y = py / height; constrain(); }
    function fan(cx, cy, radius, angle, direction) {
      ctx.save(); ctx.translate(cx, cy);
      ctx.strokeStyle = '#ced7c4'; ctx.fillStyle = '#535f53'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, radius + 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.rotate(angle);
      ctx.fillStyle = '#aab7a0';
      for (let blade = 0; blade < 3; blade++) {
        ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.ellipse(0, -radius * .43, radius * .29, radius * .52, .35, 0, Math.PI * 2); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(0, 0, radius * .2, 0, Math.PI * 2); ctx.fillStyle = '#edf2e7'; ctx.fill(); ctx.restore();
      ctx.strokeStyle = '#cad2c3'; ctx.lineWidth = 2; ctx.beginPath();
      const base = cy + (direction === 'down' ? -1 : 1) * (radius + 7);
      const end = base + (direction === 'down' ? -12 : 12);
      ctx.moveTo(cx, base); ctx.lineTo(cx, end); ctx.moveTo(cx - 11, end); ctx.lineTo(cx + 11, end); ctx.stroke();
    }
    function staticWind(cx, cy, radius, direction) {
      const sign = direction === 'down' ? 1 : -1;
      const length = Math.min(75, height * .135);
      ctx.save(); ctx.translate(cx, cy + sign * (radius + 14)); ctx.scale(1, sign);
      ctx.strokeStyle = '#dbe5d1b3'; ctx.lineWidth = 1.7; ctx.lineCap = 'round';
      // 時間・カーソル位置を参照しない静止イラスト。ファンの先に3本の風の曲線。
      for (const [offset, ratio] of [[-radius * .72, .78], [0, 1], [radius * .72, .84]]) {
        const end = length * ratio;
        ctx.beginPath(); ctx.moveTo(offset, 0);
        ctx.bezierCurveTo(offset - 6, end * .24, offset + 8, end * .53, offset, end * .76);
        ctx.bezierCurveTo(offset - 9, end * .98, offset + 14, end * 1.08, offset + 12, end * .9);
        ctx.stroke();
      }
      ctx.restore();
    }
    function drawField(elapsed) {
      ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, width, height);
      const compact = width < 450, radius = compact ? 16 : 23;
      ctx.textAlign = 'center';
      for (const field of windZones) {
        const center = (field.left + field.right) * width / 2;
        const sign = field.direction === 'down' ? 1 : -1;
        const fy = field.direction === 'down' ? height * .14 : height * .87;
        staticWind(center, fy, radius, field.direction);
        fan(center, fy, radius, elapsed * 5 * sign, field.direction);
      }
      ctx.fillStyle = '#e4e9df'; ctx.font = `${compact ? 8 : 10}px "Segoe UI", sans-serif`;
      ctx.fillText('START', width * startX(), height * .5 + cursorSize() / 2 + 29);
      ctx.fillText('GOAL', width * goalX(), height * .5 + cursorSize() / 2 + 29);
      ctx.strokeStyle = '#dce4d087'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(width * goalX(), height * .5, 13, 0, Math.PI * 2); ctx.stroke();
      ctx.textAlign = 'left';
    }
    return {
      resize(view) { width = view.width; height = view.height; constrain(); },
      setSettings(values) {
        for (const item of fanWind.settings) { const value = Number(values[item.key]); if (Number.isFinite(value)) settings[item.key] = Math.max(item.min, Math.min(item.max, value)); }
        constrain();
      },
      pointer(event) {
        if (event.pointerType === 'mouse') {
          if (event.type === 'move' || event.type === 'down') move(event.x, event.y);
        } else {
          if (event.type === 'down' && touchId === null) { touchId = event.pointerId; move(event.x, event.y); }
          else if (event.type === 'move' && event.pointerId === touchId) move(event.x, event.y);
          else if ((event.type === 'up' || event.type === 'cancel') && event.pointerId === touchId) touchId = null;
        }
      },
      key({ key, shiftKey }) {
        const step = shiftKey ? 24 : 8;
        move(x * width + (key === 'ArrowRight' ? step : key === 'ArrowLeft' ? -step : 0), y * height + (key === 'ArrowDown' ? step : key === 'ArrowUp' ? -step : 0));
      },
      suspend() { touchId = null; },
      reset() { x = .1; y = .5; touchId = null; cycles = 0; lastElapsed = 0; constrain(); },
      render({ elapsed }) {
        cycles = (cycles + Math.max(0, elapsed - lastElapsed) * settings.frequency) % 1;
        lastElapsed = elapsed;
        drawField(elapsed);
        const size = cursorSize(), left = x * width - size / 2, top = y * height - size / 2;
        const values = squareLuminances(cycles, zone?.direction || 'up', 1);
        const color = (value) => { const byte = Math.round(value * 255); return `rgb(${byte},${byte},${byte})`; };
        ctx.fillStyle = color(values.center); ctx.fillRect(left, top, size, size);
        if (zone) {
          const edge = size * settings.edgePercent / 100;
          ctx.fillStyle = color(values.top); ctx.fillRect(left, top, size, edge);
          ctx.fillStyle = color(values.bottom); ctx.fillRect(left, top + size - edge, size, edge);
        }
        refreshZone();
      },
      dispose() { touchId = null; },
    };
  },
};
