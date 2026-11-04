// 論文 chap3.tex の表 four-stroke-values と Smooth4st.shader の線形補間。
// 背景 #808080 は chap4.tex。物理寸法17 mmは再現せず、ブラウザに合わせて拡縮する。
export const squareDefaults = Object.freeze({ frequency: 2, sizePercent: 50, edgeRatio: .04, background: 128 / 255 });
// 各行: ローカルTop / Center / Bottom。図(B)ではTopが左端、Bottomが右端。
export const fourStrokeStates = Object.freeze([
  Object.freeze([1, 1, 0]),
  Object.freeze([0, 1, 1]),
  Object.freeze([0, 0, 1]),
  Object.freeze([1, 0, 0]),
]);
const directions = {
  // ブラウザでのユーザー確認に基づき、初版から全方向の割当を180度反転。
  up: { label: '上', arrow: '↑', topRegion: 'bottom', bottomRegion: 'top' },
  down: { label: '下', arrow: '↓', topRegion: 'top', bottomRegion: 'bottom' },
  left: { label: '左', arrow: '←', topRegion: 'right', bottomRegion: 'left' },
  right: { label: '右', arrow: '→', topRegion: 'left', bottomRegion: 'right' },
};
export function squareLuminances(elapsed, direction, frequency = squareDefaults.frequency) {
  const layout = directions[direction] || directions.up;
  const phase = (((elapsed * frequency) % 1 + 1) % 1) * 4;
  const index = Math.floor(phase), blend = phase - index;
  const current = fourStrokeStates[index], next = fourStrokeStates[(index + 1) % 4];
  const [localTop, center, localBottom] = current.map((value, part) => value + (next[part] - value) * blend);
  return {
    background: squareDefaults.background, center,
    top: center, bottom: center, left: center, right: center,
    [layout.topRegion]: localTop, [layout.bottomRegion]: localBottom,
  };
}

export const perpetualSquare = {
  id: 'perpetual-square',
  title: 'RPの動きを見る',
  description: '矢印を押して、固定した四角形がその方向に進むように見えるか、観察してみてください。',
  note: '背景と刺激の中心位置は固定です。大きさは表示領域に対する割合、エッジ幅は刺激の一辺に対する割合です。',
  kind: 'REVERSED PHI',
  badge: '錯視デモ',
  stageLabel: 'FIXED POSITION',
  hint: '矢印で方向を選択 · 四角形の位置は固定です',
  canvasLabel: '固定した四角形のRP刺激。周囲の矢印ボタンまたはキーボードの矢印キーで方向を選択。',
  thumbnail: 'rp',
  startOnArrow: true,
  settings: [
    { key: 'frequency', label: '周波数', type: 'range', min: .1, max: 4, step: .1, default: squareDefaults.frequency, unit: ' Hz' },
    { key: 'sizePercent', label: '刺激サイズ', type: 'range', min: 20, max: 100, step: 1, default: squareDefaults.sizePercent, unit: ' %' },
    { key: 'edgePercent', label: 'エッジ幅', type: 'range', min: .5, max: 20, step: .5, default: squareDefaults.edgeRatio * 100, unit: ' %' },
  ],
  create({ canvas, overlay, setHint, start, invalidate, setStageLabel }) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable');
    let width = 1, height = 1, panelSize = 1, direction = 'up';
    let settings = Object.fromEntries(perpetualSquare.settings.map((item) => [item.key, item.default]));
    let cycles = 0, lastElapsed = 0;
    const group = document.createElement('div');
    group.className = 'rp-direction-controls'; group.setAttribute('role', 'group'); group.setAttribute('aria-label', '見かけの進行方向');
    const output = document.createElement('output'); output.className = 'rp-direction-label'; output.setAttribute('aria-live', 'polite');
    const buttons = new Map();
    function updateControls() {
      // 通常は外周とボタンの間に32pxを確保。大きい刺激でもボタンを画面内に収める。
      const radius = Math.min(panelSize * settings.sizePercent / 200 + 52, Math.min(width, height) / 2 - 24);
      group.style.setProperty('--rp-radius', `${radius}px`);
      setStageLabel?.(`FIXED POSITION / ${settings.frequency.toFixed(1)} Hz`);
    }
    function select(next, run = true) {
      direction = next;
      for (const [key, button] of buttons) button.setAttribute('aria-pressed', String(key === direction));
      output.textContent = `選択方向：${directions[direction].label} ${directions[direction].arrow}`;
      if (run) start();
      setHint('矢印で方向を選択 · 四角形の位置は固定です');
      invalidate();
    }
    for (const [key, value] of Object.entries(directions)) {
      const button = document.createElement('button'); button.type = 'button'; button.className = `rp-arrow rp-arrow-${key}`;
      button.textContent = value.arrow; button.setAttribute('aria-label', `${value.label}向きに見える刺激を表示`);
      button.addEventListener('click', () => select(key)); buttons.set(key, button); group.append(button);
    }
    group.append(output); overlay.append(group); select('up', false);
    return {
      resize(view) {
        width = view.width; height = view.height;
        panelSize = Math.max(40, Math.min(width - 132, height - 154, 360));
        updateControls();
      },
      setSettings(values) {
        for (const item of perpetualSquare.settings) {
          const value = Number(values[item.key]);
          if (Number.isFinite(value)) settings[item.key] = Math.max(item.min, Math.min(item.max, value));
        }
        updateControls();
      },
      key({ key }) {
        const mapped = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[key];
        if (mapped) select(mapped);
      },
      reset() { cycles = 0; lastElapsed = 0; select('up', false); },
      render({ elapsed }) {
        // 周波数変更時も現在の位相を維持し、以後の進行速度だけを変える。
        cycles = (cycles + Math.max(0, elapsed - lastElapsed) * settings.frequency) % 1;
        lastElapsed = elapsed;
        const values = squareLuminances(cycles, direction, 1);
        const color = (value) => { const byte = Math.round(value * 255); return `rgb(${byte},${byte},${byte})`; };
        const cx = width / 2, cy = height / 2;
        const side = panelSize * settings.sizePercent / 100, half = side / 2;
        const edge = side * settings.edgePercent / 100;
        const left = cx - half, top = cy - half;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = color(values.background); ctx.fillRect(0, 0, width, height);
        // 面全体を中央の表示値で塗り、選択軸の両端だけを上書きする3領域構成。
        // いずれの領域も正方形の内側に収まり、時間による座標変化はない。
        ctx.fillStyle = color(values.center); ctx.fillRect(left, top, side, side);
        if (direction === 'left' || direction === 'right') {
          ctx.fillStyle = color(values.left); ctx.fillRect(left, top, edge, side);
          ctx.fillStyle = color(values.right); ctx.fillRect(left + side - edge, top, edge, side);
        } else {
          ctx.fillStyle = color(values.top); ctx.fillRect(left, top, side, edge);
          ctx.fillStyle = color(values.bottom); ctx.fillRect(left, top + side - edge, side, edge);
        }
      },
      dispose() { group.remove(); },
    };
  },
};
