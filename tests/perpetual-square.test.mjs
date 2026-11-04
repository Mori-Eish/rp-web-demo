import test from 'node:test';
import assert from 'node:assert/strict';
import { squareDefaults, fourStrokeStates, squareLuminances, perpetualSquare } from '../dist/demos/perpetual-square.js';

// デモの4状態を独立した期待値として記録し、外部の研究資料に依存せず検証する。
test('4状態・周波数・エッジ比率・背景の既定値を維持する', () => {
  assert.deepEqual(fourStrokeStates, [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 1],
    [1, 0, 0],
  ]);
  assert.equal(squareDefaults.frequency, 2);
  assert.equal(squareDefaults.edgeRatio, .04);
  assert.equal(squareDefaults.background, 128 / 255);
});

test('4代表状態と中間点を線形補間し、周期境界も滑らかにつなぐ', () => {
  const period = 1 / squareDefaults.frequency;
  for (let index = 0; index < 4; index++) {
    const atState = squareLuminances(index * period / 4, 'right');
    assert.deepEqual([atState.left, atState.center, atState.right], fourStrokeStates[index]);
    const midway = squareLuminances((index + .5) * period / 4, 'right');
    assert.deepEqual([midway.left, midway.center, midway.right], fourStrokeStates[index].map((value, part) => (value + fourStrokeStates[(index + 1) % 4][part]) / 2));
  }
});

test('ユーザー確認に基づき4方向すべてを初版から反転した配置にする', () => {
  const right = squareLuminances(0, 'right'), left = squareLuminances(0, 'left');
  const up = squareLuminances(0, 'up'), down = squareLuminances(0, 'down');
  assert.deepEqual([right.left, right.center, right.right], [1, 1, 0]);
  assert.deepEqual([left.left, left.center, left.right], [0, 1, 1]);
  assert.deepEqual([up.top, up.center, up.bottom], [0, 1, 1]);
  assert.deepEqual([down.top, down.center, down.bottom], [1, 1, 0]);
});

test('対向方向で端領域が入れ替わり、中央・固定背景・周期は共通', () => {
  for (const time of [0, .037, .125, .27]) {
    const up = squareLuminances(time, 'up'), down = squareLuminances(time, 'down');
    const left = squareLuminances(time, 'left'), right = squareLuminances(time, 'right');
    assert.equal(up.top, down.bottom); assert.equal(up.bottom, down.top);
    assert.equal(left.left, right.right); assert.equal(left.right, right.left);
    assert.equal(up.background, right.background);
    assert.equal(up.center, right.center); assert.equal(up.background, 128 / 255);
    assert.equal(up.top, left.left); assert.equal(up.bottom, right.left);
    const next = squareLuminances(time + 1 / squareDefaults.frequency, 'up');
    for (const part of Object.keys(up)) assert.ok(Math.abs(up[part] - next[part]) < 1e-12);
  }
});

test('方向・時刻で描画座標は変わらず、矢印は開始と選択状態を更新する', () => {
  class Element {
    children = []; attrs = {}; handlers = {}; style = { values: {}, setProperty(key, value) { this.values[key] = value; } };
    setAttribute(key, value) { this.attrs[key] = value; }
    addEventListener(key, handler) { this.handlers[key] = handler; }
    append(...children) { this.children.push(...children); }
    remove() { this.removed = true; }
  }
  const original = globalThis.document;
  globalThis.document = { createElement: () => new Element() };
  try {
    const overlay = new Element(), calls = [];
    const ctx = { clearRect() {}, fillRect(...coords) { calls.push({ coords, color: this.fillStyle }); } };
    let starts = 0;
    const instance = perpetualSquare.create({ canvas: { getContext: () => ctx }, overlay, setHint() {}, start() { starts++; }, invalidate() {} });
    instance.resize({ width: 600, height: 400 });
    const buttons = overlay.children[0].children.slice(0, 4);
    instance.render({ elapsed: 0 }); const initial = calls.map((call) => call.coords);
    assert.equal(calls.length, 4, '固定背景・中央の面・両端の2領域を描画する');
    const [bx, by, bw, bh] = calls[0].coords, [cx, cy, cw, ch] = calls[1].coords;
    assert.equal(cw, ch, '中央の面は正方形');
    assert.ok(cw > 0 && cw < bw && ch < bh);
    assert.equal(cx + cw / 2, bx + bw / 2, '水平中央に固定');
    assert.equal(cy + ch / 2, by + bh / 2, '垂直中央に固定');
    assert.equal(starts, 0, '開くだけでは自動再生しない');
    const centerColors = new Set();
    for (const button of buttons) {
      button.handlers.click();
      assert.equal(button.attrs['aria-pressed'], 'true');
      assert.equal(buttons.filter((item) => item.attrs['aria-pressed'] === 'true').length, 1);
      calls.length = 0; instance.render({ elapsed: 0 });
      const orientedGeometry = calls.map((call) => call.coords);
      for (const elapsed of [0, .037, .125, .1875, .25, .375, .5]) {
        calls.length = 0; instance.render({ elapsed });
        assert.deepEqual(calls.map((call) => call.coords), orientedGeometry, '選択した方向の領域境界は時間で移動しない');
        assert.deepEqual(calls.slice(0, 2).map((call) => call.coords), initial.slice(0, 2), '方向切替で正方形の座標・サイズは変わらない');
        assert.equal(calls[0].color, 'rgb(128,128,128)', '背景は常に固定の灰色');
        centerColors.add(calls[1].color);
        for (const strip of calls.slice(2)) {
          const [sx, sy, sw, sh] = strip.coords;
          assert.ok(sx >= cx - 1e-8 && sy >= cy - 1e-8 && sx + sw <= cx + cw + 1e-8 && sy + sh <= cy + ch + 1e-8, 'エッジは正方形の内側');
          assert.ok(Math.abs(Math.min(sw, sh) / cw - .04) < 1e-12, 'エッジ幅は正方形の4%');
        }
      }
    }
    assert.ok(centerColors.has('rgb(255,255,255)') && centerColors.has('rgb(0,0,0)') && centerColors.has('rgb(128,128,128)'), '中央は白・黒・中間のグレーへ変調される');
    assert.equal(starts, 4);
    instance.reset(); assert.equal(buttons[0].attrs['aria-pressed'], 'true'); assert.equal(starts, 4);
    calls.length = 0; instance.render({ elapsed: .0625 });
    const beforeFrequencyChange = calls.map((call) => ({ ...call }));
    instance.setSettings({ frequency: 4 });
    calls.length = 0; instance.render({ elapsed: .0625 });
    assert.deepEqual(calls, beforeFrequencyChange, '周波数を変えた瞬間には表示位相が飛ばない');
    calls.length = 0; instance.render({ elapsed: .125 });
    assert.equal(calls[1].color, 'rgb(128,128,128)', '以後は新しい周波数で進行する');
    const oldSide = calls[1].coords[2];
    instance.setSettings({ sizePercent: 80, edgePercent: 12 });
    calls.length = 0; instance.render({ elapsed: .125 });
    const [nx, ny, newSide] = calls[1].coords;
    assert.ok(Math.abs(newSide / oldSide - 1.6) < 1e-12);
    assert.equal(nx + newSide / 2, 300); assert.equal(ny + newSide / 2, 200);
    assert.ok(Math.abs(calls[2].coords[3] / newSide - .12) < 1e-12, 'エッジ幅を一辺に対する割合で変更する');
    assert.equal(overlay.children[0].style.values['--rp-radius'], `${newSide / 2 + 52}px`, '矢印は変更後の刺激サイズから間隔を空けて追従する');
    instance.dispose(); assert.equal(overlay.children[0].removed, true);
  } finally { globalThis.document = original; }
});
