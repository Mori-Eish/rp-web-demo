import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { alternatingDirections, directionZoneAt, relativeRPDirection } from '../dist/demos/alternating-directions.js';
import { fanWind } from '../dist/demos/fan-wind.js';
import { setLanguage } from '../dist/i18n.js';

afterEach(() => setLanguage('ja'));
const white = 'rgb(255,255,255)', black = 'rgb(0,0,0)';

test('4等分の境界と同・逆・同・逆の対応を左右の移動で維持する', () => {
  assert.deepEqual(alternatingDirections.settings.slice(0, 3), fanWind.settings, 'ファンと同じ標準値と調整範囲');
  assert.deepEqual([-1, 0, .249999, .25, .499999, .5, .749999, .75, 1, 2].map(directionZoneAt), [0, 0, 0, 1, 1, 2, 2, 3, 3, 3]);
  assert.deepEqual([.125, .375, .625, .875].map((u) => relativeRPDirection(u, 'right')), ['right', 'left', 'right', 'left']);
  assert.deepEqual([.125, .375, .625, .875].map((u) => relativeRPDirection(u, 'left')), ['left', 'right', 'left', 'right']);
});

function harness() {
  const rects = [], texts = [], lines = [];
  const ctx = {
    fillRect(...coords) { rects.push({ coords, color: this.fillStyle }); },
    fillText(...args) { texts.push(args); },
    beginPath() {}, moveTo(...args) { lines.push(['move', ...args]); }, lineTo(...args) { lines.push(['line', ...args]); }, stroke() {},
  };
  const instance = alternatingDirections.create({ canvas: { getContext: () => ctx }, setStageLabel() {} });
  instance.resize({ width: 800, height: 480 });
  const render = (elapsed = 0) => {
    rects.length = texts.length = lines.length = 0;
    instance.render({ elapsed });
    return structuredClone({ rects, texts, lines });
  };
  const mouse = (x, y = 240) => instance.pointer({ type: 'move', pointerType: 'mouse', pointerId: 1, x, y });
  return { instance, render, mouse };
}

test('区間を順に通過・引き返し、境界上でも中心位置からRPを選ぶ', () => {
  const { render, mouse } = harness();
  const initial = render();
  assert.deepEqual(initial.rects[1].coords, [8, 210, 60, 60]);
  assert.deepEqual(initial.lines, [
    ['move', 219, 83], ['line', 219, 422],
    ['move', 400, 83], ['line', 400, 422],
    ['move', 581, 83], ['line', 581, 422],
  ]);
  const positions = [128.5, 309.5, 490.5, 671.5];
  const right = [white, white, black], left = [white, black, white];
  positions.forEach((x, index) => {
    mouse(x); const state = render();
    assert.equal(state.rects.length, 4, '背景と刺激の3領域だけを塗る');
    assert.deepEqual(state.rects.slice(1).map((r) => r.color), index % 2 ? left : right);
    assert.deepEqual(state.rects[1].coords, [x - 30, 210, 60, 60]);
    assert.equal(state.rects[2].coords[2], 1.5);
    assert.deepEqual(state.texts, initial.texts, '進入で条件名を変えたり強調したりしない');
  });
  [650, 490.5, 309.5, 128.5].forEach((x, index) => {
    mouse(x); const state = render();
    assert.deepEqual(state.rects.slice(1).map((r) => r.color), index % 2 ? left : right, '左向き移動では相対関係を維持してRPの左右を反転');
  });
  mouse(218.9); assert.deepEqual(render().rects.slice(1).map((r) => r.color), right);
  mouse(219); assert.deepEqual(render().rects.slice(1).map((r) => r.color), left, '第2区間の境界から逆方向');
  mouse(400); assert.deepEqual(render().rects.slice(1).map((r) => r.color), right);
  mouse(581); assert.deepEqual(render().rects.slice(1).map((r) => r.color), left);
});

test('左右反転・停止・上下入力・画面端の制限を実際の横移動から判定する', () => {
  const { instance, render, mouse } = harness();
  mouse(300); const goingRight = render();
  mouse(290); const goingLeft = render();
  assert.deepEqual(goingRight.rects.slice(2).map((r) => r.color), goingLeft.rects.slice(2).map((r) => r.color).reverse());
  mouse(290, 10); assert.deepEqual(render(), goingLeft, '縦の入力だけでは方向も位置も変わらない');
  instance.key({ key: 'ArrowUp' }); assert.deepEqual(render(), goingLeft);
  const stopped = render(.125);
  assert.deepEqual(stopped.rects[1].coords, goingLeft.rects[1].coords);
  assert.notDeepEqual(stopped.rects.slice(2).map((r) => r.color), goingLeft.rects.slice(2).map((r) => r.color), '停止中も直前の向きでRP系列を続ける');
  mouse(900); const edge = render(.125);
  assert.equal(edge.rects[1].coords[0] + 60, 792);
  mouse(1000); assert.deepEqual(render(.125), edge, '画面外への入力で動かない時は方向を変えない');
  mouse(800); assert.deepEqual(render(.125), edge, '生の入力座標が戻っても、制限後のカーソルが動かなければ方向を変えない');
  instance.key({ key: 'ArrowLeft', shiftKey: true });
  assert.equal(render(.125).rects[1].coords[0], edge.rects[1].coords[0] - 24);
});

test('区間・方向・設定変更で位相を保ち、ガイド・翻訳・リサイズに対応する', () => {
  const { instance, render, mouse } = harness();
  mouse(300); const before = render(.03125);
  instance.setSettings({ frequency: 4 });
  assert.deepEqual(render(.03125), before);
  mouse(400); const afterEntry = render(.03125);
  assert.equal(afterEntry.rects[1].color, before.rects[1].color, '進入時も中央の位相は連続');
  mouse(399); const afterReverse = render(.03125);
  assert.equal(afterReverse.rects[1].color, before.rects[1].color, '移動反転時も位相は連続');
  instance.setSettings({ guides: false, cursorSize: 80, edgePercent: 10 });
  const hidden = render(.03125);
  assert.deepEqual(hidden.texts.map((item) => item[0]), ['START', 'GOAL']); assert.equal(hidden.lines.length, 0);
  assert.equal(hidden.rects[2].coords[2], 8);
  instance.setSettings({ guides: true });
  setLanguage('en'); const english = render(.03125);
  assert.deepEqual(english.texts.slice(0, 4).map((item) => item[0]), ['1 · Same', '2 · Opposite', '3 · Same', '4 · Opposite']);
  assert.deepEqual(english.rects, hidden.rects, '翻訳で位置・位相を変えない');
  instance.resize({ width: 320, height: 420 }); mouse(400);
  const mobile = render(.03125);
  assert.equal(mobile.rects[1].coords[0] + 80, 312);
  assert.equal(mobile.rects[1].coords[1], 170);
});

test('タッチ・ペンの識別と解除、リセットに対応する', () => {
  const { instance, render } = harness();
  const touch = (type, x, pointerId = 2, pointerType = 'touch') => instance.pointer({ type, x, y: 20, pointerType, pointerId });
  const initial = render();
  touch('move', 300); assert.deepEqual(render(), initial);
  touch('down', 300); const down = render();
  assert.deepEqual(down.rects[1].coords, [270, 210, 60, 60]);
  touch('move', 500, 3); assert.deepEqual(render(), down);
  touch('cancel', 300); touch('move', 500); assert.deepEqual(render(), down);
  touch('down', 500, 4, 'pen'); const pen = render();
  instance.suspend(); touch('move', 200, 4, 'pen'); assert.deepEqual(render(), pen);
  instance.reset(); assert.deepEqual(render(), initial);
  instance.key({ key: 'ArrowRight', shiftKey: false }); assert.deepEqual(render().rects[1].coords, [16, 210, 60, 60]);
  instance.dispose();
});
