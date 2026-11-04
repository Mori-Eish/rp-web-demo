import test from 'node:test';
import assert from 'node:assert/strict';
import { bendingBar, barDefaults, barResponse, barLuminances } from '../dist/demos/bending-bar.js';

test('距離から近接率・エッジ幅・連続した反転量を計算する', () => {
  assert.equal(barDefaults.segments, 28);
  assert.equal(barDefaults.frequency, 2);
  assert.deepEqual(barResponse(0), { proximity: 1, edgeRatio: .06, invertAmount: 0 });
  assert.deepEqual(barResponse(150), { proximity: .5, edgeRatio: .06, invertAmount: .5 });
  assert.deepEqual(barResponse(300), { proximity: 0, edgeRatio: .06, invertAmount: 1 });
  assert.deepEqual(barResponse(900), barResponse(300));
  assert.deepEqual(barResponse(150, { enableInvertMode: false }), { proximity: .5, edgeRatio: .03, invertAmount: 0 });
  assert.deepEqual(barResponse(300, { enableInvertMode: false }), { proximity: 0, edgeRatio: 0, invertAmount: 0 });
  assert.equal(barResponse(0, { maxBarHeight: .12 }).edgeRatio, .12);
  assert.equal(barResponse(300, { maxBarHeight: .12 }).edgeRatio, .06);
});

test('Unityの−90°配置・対象の左右・エッジの交換補間を再現する', () => {
  assert.deepEqual(barLuminances(0, 600, 400, 0), { center: 1, left: 0, right: 1 });
  assert.deepEqual(barLuminances(0, 200, 400, 0), { center: 1, left: 1, right: 0 });
  assert.deepEqual(barLuminances(0, 600, 400, .5), { center: 1, left: .5, right: .5 });
  assert.deepEqual(barLuminances(0, 600, 400, 1), barLuminances(0, 200, 400, 0));
  // 輝度の1−値ではなく、時刻ごとの両端の値を混ぜる（両端が同輝度の時刻も保持）。
  assert.deepEqual(barLuminances(.125, 600, 400, .8), { center: 1, left: .5, right: .5 });
});

function harness() {
  const rects = [], rings = [];
  const ctx = {
    fillRect(...coords) { rects.push({ coords, color: this.fillStyle }); },
    beginPath() {}, arc(...args) { rings.push(args); }, stroke() {},
  };
  const labels = [];
  const instance = bendingBar.create({ canvas: { getContext: () => ctx }, setStageLabel: (text) => labels.push(text) });
  instance.resize({ width: 800, height: 540 });
  instance.setSettings(Object.fromEntries(bendingBar.settings.map((s) => [s.key, s.default])));
  const render = (elapsed) => {
    rects.length = rings.length = 0;
    instance.render({ elapsed });
    return { rects: structuredClone(rects), rings: structuredClone(rings) };
  };
  const mouse = (x, y) => instance.pointer({ type: 'move', x, y, pointerType: 'mouse', pointerId: 1 });
  return { instance, render, mouse, labels };
}

test('28要素を隙間なく固定配置し、局所的なエッジ変調だけを変える', () => {
  const { instance, render, mouse } = harness();
  const initial = render(0);
  assert.equal(initial.rects.length, 2 + 28 * 2);
  const [left, top, side, length] = initial.rects[1].coords;
  assert.equal(left + side / 2, 400);
  assert.equal(top + length / 2, 270);
  assert.ok(Math.abs(length / side - 28) < 1e-12);
  for (let i = 0; i < 28; i++) {
    const l = initial.rects[2 + i * 2].coords, r = initial.rects[3 + i * 2].coords;
    assert.ok(Math.abs(l[1] - (top + side * i)) < 1e-12);
    assert.equal(l[2], side * .06);
    assert.equal(l[3], side);
    assert.equal(r[0] + r[2], left + side);
  }
  mouse(420, top + side * 13.5);
  const near = render(0);
  assert.deepEqual(near.rects.map((r) => r.coords), initial.rects.map((r) => r.coords));
  assert.notEqual(near.rects[2].color, near.rects[2 + 13 * 2].color, '高さごとに距離を計算する');
  assert.equal(near.rects[1].color, initial.rects[1].color, '中央の位相は距離によらない');
  mouse(380, top + side * 13.5);
  const opposite = render(0);
  assert.equal(near.rects[2 + 13 * 2].color, opposite.rects[3 + 13 * 2].color);
  assert.deepEqual(opposite.rects.map((r) => r.coords), near.rects.map((r) => r.coords), '左右の切替でも実際には曲げない');
  assert.deepEqual(render(.03125).rects.map((r) => r.coords), near.rects.map((r) => r.coords));
  mouse(800, 0); instance.setSettings({ maxDistance: 60, invertMode: false });
  assert.equal(render(.03125).rects.length, 2, '反転を切ると範囲外では一様な点滅だけ');
});

test('位相連続・サイズ変更・タッチ解除・キーボード・リセットに対応する', () => {
  const { instance, render, mouse, labels } = harness();
  const before = render(.0625);
  instance.setSettings({ frequency: 4 });
  assert.deepEqual(render(.0625), before, '周波数変更の瞬間は輝度を維持する');
  assert.equal(render(.1875).rects[1].color, 'rgb(0,0,0)', '以後は新しい周波数で進む');
  const oldLength = before.rects[1].coords[3];
  instance.setSettings({ lengthPercent: 45, edgePercent: 10 });
  const smaller = render(.1875);
  assert.equal(smaller.rects[1].coords[3], oldLength / 2);
  assert.equal(smaller.rects[2].coords[2], smaller.rects[1].coords[2] * .1);
  const touch = (type, x, pointerId = 3) => instance.pointer({ type, x, y: 100, pointerType: 'touch', pointerId });
  const oldRing = render(.1875).rings;
  touch('move', 100); assert.deepEqual(render(.1875).rings, oldRing);
  touch('down', 100); assert.equal(render(.1875).rings[0][0], 100);
  touch('move', 200, 4); assert.equal(render(.1875).rings[0][0], 100);
  instance.suspend(); touch('move', 200); assert.equal(render(.1875).rings[0][0], 100);
  touch('down', 200); touch('cancel', 200); touch('move', 300); assert.equal(render(.1875).rings[0][0], 200);
  mouse(400, 200); instance.key({ key: 'ArrowLeft', shiftKey: true }); assert.equal(render(.1875).rings[0][0], 376);
  instance.key({ key: 'ArrowDown', shiftKey: false }); assert.equal(render(.1875).rings[0][1], 208);
  mouse(-10, 2000); assert.deepEqual(render(.1875).rings[0].slice(0, 2), [0, 540]);
  instance.reset(); const reset = render(0);
  assert.deepEqual(reset.rings[0].slice(0, 2), [624, 270]);
  assert.equal(reset.rects[1].color, 'rgb(255,255,255)');
  instance.resize({ width: 320, height: 440 });
  const mobile = render(0), [x, y, w, h] = mobile.rects[1].coords;
  assert.ok(x >= 0 && y >= 0 && x + w <= 320 && y + h <= 440);
  assert.equal(labels.at(-1), 'RP BAR / 4.0 Hz');
  instance.dispose();
});
