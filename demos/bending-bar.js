import { squareLuminances } from './perpetual-square.js';

export const barDefaults = Object.freeze({ frequency: 2, segments: 28, maxDistance: 300, maxBarHeight: .06, baseBarHeight: .06 });
const clamp01 = (value) => Math.max(0, Math.min(1, value));

// MouseHoverBarControllerと同じ距離制御。反転は1−輝度ではなく、両端の表示値の交換。
export function barResponse(distance, { maxDistance = barDefaults.maxDistance, maxBarHeight = barDefaults.maxBarHeight, baseBarHeight = barDefaults.baseBarHeight, enableInvertMode = true } = {}) {
  const proximity = clamp01(1 - Math.max(0, distance) / Math.max(1, maxDistance));
  return {
    proximity,
    edgeRatio: enableInvertMode ? Math.max(baseBarHeight, proximity * maxBarHeight) : proximity * maxBarHeight,
    invertAmount: enableInvertMode ? 1 - proximity : 0,
  };
}

export function barLuminances(cycles, targetX, elementX, invertAmount) {
  // Unityの基準回転−90°ではローカルTopが画面右。対象が左なら180°回転する。
  // 既存デモの方向名に置き換えて、この配置と共通の4状態系列を再現する。
  const values = squareLuminances(cycles, targetX < elementX ? 'right' : 'left', 1);
  return {
    center: values.center,
    left: values.left + (values.right - values.left) * invertAmount,
    right: values.right + (values.left - values.right) * invertAmount,
  };
}

export const bendingBar = {
  id: 'bending-bar',
  title: 'しなって見える棒',
  description: '棒のそばでマウスを上下左右に動かし、見え方の変化を観察してください。',
  note: '棒の位置と形は固定です。マウスとの距離に応じて輝度だけが変わります。タッチはドラッグ、矢印キーでも操作できます。',
  kind: 'BENDING EXPLORATION',
  badge: '体験デモ',
  stageLabel: 'RP BAR',
  stageClass: 'bar-stage',
  hint: '棒のそばでマウスを動かす / タッチでドラッグ / 矢印キー',
  canvasLabel: '縦に並んだ28個のRP刺激。マウス、タッチのドラッグ、矢印キーで近づく位置を変えてください。',
  thumbnail: 'bar',
  settings: [
    { key: 'frequency', label: '周波数', type: 'range', min: .1, max: 4, step: .1, default: barDefaults.frequency, unit: ' Hz' },
    { key: 'lengthPercent', label: '棒の長さ', type: 'range', min: 40, max: 100, step: 1, default: 90, unit: ' %' },
    { key: 'maxDistance', label: '反応する距離', type: 'range', min: 60, max: 500, step: 10, default: barDefaults.maxDistance, unit: ' px' },
    { key: 'edgePercent', label: 'エッジ幅', type: 'range', min: .5, max: 20, step: .5, default: barDefaults.maxBarHeight * 100, unit: ' %' },
    { key: 'invertMode', label: '離れた部分を逆向きにする', type: 'checkbox', default: true },
  ],
  create({ canvas, setStageLabel }) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable');
    let width = 1, height = 1, x = .78, y = .5, touchId = null;
    let cycles = 0, lastElapsed = 0;
    const settings = Object.fromEntries(bendingBar.settings.map((item) => [item.key, item.default]));
    const color = (value) => { const byte = Math.round(value * 255); return `rgb(${byte},${byte},${byte})`; };
    function move(px, py) { x = clamp01(px / width); y = clamp01(py / height); }
    return {
      resize(view) { width = Math.max(1, view.width); height = Math.max(1, view.height); },
      setSettings(values) {
        for (const item of bendingBar.settings) {
          if (item.type === 'checkbox') { if (typeof values[item.key] === 'boolean') settings[item.key] = values[item.key]; }
          else { const value = Number(values[item.key]); if (Number.isFinite(value)) settings[item.key] = Math.max(item.min, Math.min(item.max, value)); }
        }
        setStageLabel?.(`RP BAR / ${settings.frequency.toFixed(1)} Hz`);
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
      reset() { x = .78; y = .5; cycles = 0; lastElapsed = 0; touchId = null; },
      render({ elapsed }) {
        cycles = (cycles + Math.max(0, elapsed - lastElapsed) * settings.frequency) % 1;
        lastElapsed = elapsed;
        ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, width, height);
        const length = Math.max(28, Math.min(height - 128, 560)) * settings.lengthPercent / 100;
        const side = length / barDefaults.segments, left = (width - side) / 2, top = (height - length) / 2;
        const px = x * width, py = y * height, cx = width / 2;
        // 中央は全要素で同位相。一続きの面を先に塗り、隙間や余分な枠線を作らない。
        ctx.fillStyle = color(squareLuminances(cycles, 'left', 1).center); ctx.fillRect(left, top, side, length);
        for (let index = 0; index < barDefaults.segments; index++) {
          const rowTop = top + side * index, cy = rowTop + side / 2;
          const response = barResponse(Math.hypot(px - cx, py - cy), {
            maxDistance: settings.maxDistance,
            maxBarHeight: settings.edgePercent / 100,
            baseBarHeight: settings.edgePercent / 100,
            enableInvertMode: settings.invertMode,
          });
          const values = barLuminances(cycles, px, cx, response.invertAmount), edge = side * response.edgeRatio;
          if (edge > 0) {
            ctx.fillStyle = color(values.left); ctx.fillRect(left, rowTop, edge, side);
            ctx.fillStyle = color(values.right); ctx.fillRect(left + side - edge, rowTop, edge, side);
          }
        }
        // 入力位置を示す静かな目印。棒の座標や形を実際に変形させる処理は加えない。
        ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.strokeStyle = '#f6f5f0'; ctx.lineWidth = 1.5; ctx.stroke();
      },
      dispose() { touchId = null; },
    };
  },
};
