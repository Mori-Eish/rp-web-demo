import { squareLuminances } from './perpetual-square.js';
import { t } from '../i18n.js';

// カーソル中心が実際に動ける範囲を等幅の4区間に分ける。
export function directionZoneAt(position) {
  return Math.min(3, Math.floor(Math.max(0, Math.min(1, position)) * 4));
}
export function relativeRPDirection(position, movement) {
  return directionZoneAt(position) % 2 === 0 ? movement : movement === 'right' ? 'left' : 'right';
}

// 端では折り返し、1フレームで複数の端を通過しても移動距離を保つ。
export function advanceAutomatic(position, movement, distance, span) {
  if (span <= 0 || distance <= 0) return { position, movement };
  const unfolded = movement === 'right' ? position : 2 - position;
  const phase = (unfolded + distance / span) % 2;
  return { position: phase <= 1 ? phase : 2 - phase, movement: phase < 1 ? 'right' : 'left' };
}

export const alternatingDirections = {
  id: 'alternating-directions',
  title: '同方向・逆方向のRP',
  description: 'カーソルを手動または自動で左右に動かし、4エリアで移動方向に対して同方向・逆方向のRPを切り替えます。',
  note: '左から同方向・逆方向・同方向・逆方向です。「自動で往復する」をONにして再生すると、一定速度で左右に往復します。OFFではマウス、タッチのドラッグ、左右の矢印キーで操作できます。',
  kind: 'DIRECTION COMPARISON',
  badge: '体験デモ',
  stageLabel: '4 AREAS',
  stageClass: 'wind-stage',
  hint: '手動操作、または「自動で往復する」をONにして再生',
  canvasLabel: '左右の移動方向に対して、左から同方向・逆方向・同方向・逆方向のRPを提示する4エリア。',
  thumbnail: 'directions',
  settings: [
    { key: 'autoMove', label: '自動で往復する', type: 'checkbox', default: true },
    { key: 'autoSpeed', label: '自動移動の速度', type: 'range', min: 20, max: 300, step: 10, default: 50, unit: ' px/s' },
    { key: 'frequency', label: '周波数', type: 'range', min: .1, max: 4, step: .1, default: 2, unit: ' Hz' },
    { key: 'cursorSize', label: 'カーソルサイズ', type: 'range', min: 24, max: 80, step: 2, default: 60, unit: ' px' },
    { key: 'edgePercent', label: 'エッジ幅', type: 'range', min: .5, max: 20, step: .5, default: 2.5, unit: ' %' },
    { key: 'guides', label: 'ガイドを表示', type: 'checkbox', default: false },
  ],
  create({ canvas, setStageLabel, setHint = () => {} }) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable');
    let width = 1, height = 1, position = 0, movement = 'right', touchId = null;
    let cycles = 0, lastElapsed = 0;
    const settings = Object.fromEntries(alternatingDirections.settings.map((item) => [item.key, item.default]));
    const updateHint = () => setHint(t(settings.autoMove ? 'alternating.autoHint' : 'alternating.manualHint'));
    const cursorSize = () => Math.min(settings.cursorSize, Math.max(16, Math.min(width, height) - 32));
    function bounds() {
      const margin = cursorSize() / 2 + 8;
      return { min: margin, max: Math.max(margin, width - margin) };
    }
    function move(px) {
      const { min, max } = bounds();
      const next = Math.max(0, Math.min(1, (px - min) / Math.max(1, max - min)));
      const dx = (next - position) * (max - min);
      // 入力の生座標ではなく、端で制限した後の実際のカーソル移動で判定する。
      if (dx > .01) movement = 'right';
      else if (dx < -.01) movement = 'left';
      position = next;
    }
    return {
      localize() { updateHint(); },
      resize(view) { width = Math.max(1, view.width); height = Math.max(1, view.height); },
      setSettings(values) {
        const previousMode = settings.autoMove;
        for (const item of alternatingDirections.settings) {
          if (item.type === 'checkbox') { if (typeof values[item.key] === 'boolean') settings[item.key] = values[item.key]; }
          else { const value = Number(values[item.key]); if (Number.isFinite(value)) settings[item.key] = Math.max(item.min, Math.min(item.max, value)); }
        }
        if (previousMode !== settings.autoMove) touchId = null;
        setStageLabel?.(`4 AREAS / ${settings.frequency.toFixed(1)} Hz`);
        updateHint();
      },
      pointer(event) {
        if (settings.autoMove) return;
        if (event.pointerType === 'mouse') {
          if (event.type === 'move' || event.type === 'down') move(event.x);
        } else {
          if (event.type === 'down' && touchId === null) { touchId = event.pointerId; move(event.x); }
          else if (event.type === 'move' && event.pointerId === touchId) move(event.x);
          else if ((event.type === 'up' || event.type === 'cancel') && event.pointerId === touchId) touchId = null;
        }
      },
      key({ key, shiftKey }) {
        if (settings.autoMove) return;
        if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;
        const { min, max } = bounds(), step = shiftKey ? 24 : 8;
        move(min + position * (max - min) + (key === 'ArrowRight' ? step : -step));
      },
      suspend() { touchId = null; },
      reset() { position = 0; movement = 'right'; cycles = 0; lastElapsed = 0; touchId = null; },
      render({ elapsed }) {
        const delta = Math.max(0, elapsed - lastElapsed);
        cycles = (cycles + delta * settings.frequency) % 1;
        lastElapsed = elapsed;
        ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, width, height);
        const size = cursorSize(), { min, max } = bounds(), span = max - min;
        if (settings.autoMove) ({ position, movement } = advanceAutomatic(position, movement, settings.autoSpeed * delta, span));
        if (settings.guides) {
          ctx.strokeStyle = '#a8ada5'; ctx.lineWidth = 1; ctx.beginPath();
          for (let edge = 1; edge < 4; edge++) {
            const x = min + span * edge / 4;
            ctx.moveTo(x, 83); ctx.lineTo(x, height - 58);
          }
          ctx.stroke();
          ctx.textAlign = 'center'; ctx.fillStyle = '#30382e'; ctx.font = `${width < 450 ? 8 : 10}px "Segoe UI", sans-serif`;
          for (let index = 0; index < 4; index++) {
            ctx.fillText(`${index + 1} · ${t(index % 2 === 0 ? 'zones.same' : 'zones.opposite')}`, min + span * (index + .5) / 4, 64);
          }
        }
        const x = min + position * span, y = height / 2;
        const values = squareLuminances(cycles, relativeRPDirection(position, movement), 1);
        const color = (value) => { const byte = Math.round(value * 255); return `rgb(${byte},${byte},${byte})`; };
        const left = x - size / 2, top = y - size / 2, edge = size * settings.edgePercent / 100;
        ctx.fillStyle = color(values.center); ctx.fillRect(left, top, size, size);
        ctx.fillStyle = color(values.left); ctx.fillRect(left, top, edge, size);
        ctx.fillStyle = color(values.right); ctx.fillRect(left + size - edge, top, edge, size);
        ctx.textAlign = 'center'; ctx.fillStyle = '#e4e9df'; ctx.font = `${width < 450 ? 8 : 10}px "Segoe UI", sans-serif`;
        ctx.fillText('START', min, y + size / 2 + 29); ctx.fillText('GOAL', max, y + size / 2 + 29);
        ctx.textAlign = 'left';
      },
      dispose() { touchId = null; },
    };
  },
};
