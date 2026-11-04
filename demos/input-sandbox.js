// RP刺激ではない中立サンプル。新しいデモは _template.js を複製して登録する。
export const inputSandbox = {
  id: 'input-sandbox',
  title: 'インタラクション・サンドボックス',
  description: '四角形を動かして、ブラウザでの入力と描画を確認できます。',
  note: 'RP刺激・抵抗感の提示は含みません。操作中の四角形は入力位置に追従します。研究用刺激の再現性は、別途検証が必要です。',
  kind: 'FOUNDATION',
  badge: '基盤確認用',
  stageLabel: 'INPUT SANDBOX',
  hint: '四角形をドラッグ / 矢印キーで移動',
  canvasLabel: '四角形をドラッグして操作を確認。キーボードでは矢印キーで移動できます。',
  thumbnail: 'input',
  settings: [
    { key: 'size', label: '四角形のサイズ', type: 'range', min: 48, max: 120, step: 4, default: 80, unit: ' px' },
    { key: 'guides', label: 'ガイドを表示', type: 'checkbox', default: true },
  ],
  create({ canvas, setHint }) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('このブラウザではCanvas 2Dを利用できません。');
    let width = 1, height = 1, x = 0.5, y = 0.5, settings = { size: 80, guides: true }, drag = null;
    const limit = (value, size, extent) => Math.max(size / 2 + 8, Math.min(extent - size / 2 - 8, value));
    const constrain = () => { x = limit(x * width, settings.size, width) / width; y = limit(y * height, settings.size, height) / height; };
    return {
      resize(view) { width = view.width; height = view.height; constrain(); },
      setSettings(next) { settings = next; constrain(); },
      pointer({ type, x: px, y: py, pointerId }) {
        if (type === 'down' && !drag && Math.abs(px - x * width) <= settings.size / 2 + 8 && Math.abs(py - y * height) <= settings.size / 2 + 8) {
          drag = { pointerId, dx: px - x * width, dy: py - y * height };
          setHint('ドラッグ中 · 指を離すと停止します');
        } else if (type === 'move' && drag?.pointerId === pointerId) {
          x = (px - drag.dx) / width; y = (py - drag.dy) / height; constrain();
        } else if ((type === 'up' || type === 'cancel') && drag?.pointerId === pointerId) {
          drag = null; setHint('四角形をドラッグ / 矢印キーで移動');
        }
      },
      key({ key, shiftKey }) {
        const step = shiftKey ? 20 : 5;
        if (key === 'ArrowLeft') x -= step / width;
        if (key === 'ArrowRight') x += step / width;
        if (key === 'ArrowUp') y -= step / height;
        if (key === 'ArrowDown') y += step / height;
        constrain();
      },
      suspend() { drag = null; },
      reset() { x = .5; y = .5; drag = null; },
      render() {
        ctx.clearRect(0, 0, width, height);
        const px = x * width, py = y * height, size = settings.size;
        if (settings.guides) {
          ctx.strokeStyle = '#7d8f6f20'; ctx.lineWidth = 1;
          ctx.beginPath();
          for (let gx = 24; gx < width; gx += 32) { ctx.moveTo(gx, 0); ctx.lineTo(gx, height); }
          for (let gy = 24; gy < height; gy += 32) { ctx.moveTo(0, gy); ctx.lineTo(width, gy); }
          ctx.stroke();
          ctx.strokeStyle = '#7b8d6b80'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(px, 43); ctx.lineTo(px, height - 40); ctx.moveTo(16, py); ctx.lineTo(width - 16, py); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.save(); ctx.shadowColor = '#37492a20'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
        ctx.fillStyle = drag ? '#fefef7' : '#f7f8ed'; ctx.fillRect(px - size / 2, py - size / 2, size, size); ctx.restore();
        ctx.strokeStyle = '#adbca0'; ctx.strokeRect(px - size / 2, py - size / 2, size, size);
        ctx.strokeStyle = '#a8b69c'; ctx.beginPath(); ctx.moveTo(px - 5, py); ctx.lineTo(px + 5, py); ctx.moveTo(px, py - 5); ctx.lineTo(px, py + 5); ctx.stroke();
      },
      dispose() { drag = null; },
    };
  },
};
