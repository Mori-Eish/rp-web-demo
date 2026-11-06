import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fanWind, windZoneAt, windZones } from '../dist/demos/fan-wind.js';
import { setLanguage } from '../dist/i18n.js';
afterEach(() => setLanguage('ja'));

test('中心位置による風エリアの進入・退出・上下の方向判定', () => {
  assert.equal(windZoneAt(80, 240, 800, 480), null);
  assert.equal(windZoneAt(296, 240, 800, 480)?.direction, 'down');
  assert.equal(windZoneAt(544, 240, 800, 480)?.direction, 'up');
  assert.equal(windZoneAt(296, 70, 800, 480), null);
  assert.equal(windZoneAt(296, 420, 800, 480), null);
  for (const zone of windZones) {
    assert.equal(windZoneAt(zone.left * 800, zone.top * 480, 800, 480), zone);
    assert.equal(windZoneAt(zone.right * 800 + .001, 240, 800, 480), null);
  }
  assert.equal(windZoneAt(1, 1, 0, 0), null);
});

test('マウス追従・領域外の一様点滅・領域内だけのRP・設定変更・タッチ・リセット', () => {
    const calls = [];
    const decorations = [], fanColors = [], windCurves = [];
    const context = new Proxy({}, {
      get(target, key) {
        if (key === 'fillRect') return (...coords) => calls.push({ coords, color: target.fillStyle });
        if (key === 'fill') return () => fanColors.push(target.fillStyle);
        if (key === 'bezierCurveTo') return (...points) => windCurves.push(points);
        if (['fillText', 'strokeRect', 'setLineDash'].includes(key)) return (...args) => decorations.push([key, ...args]);
        return () => {};
      },
      set(target, key, value) { target[key] = value; return true; },
    });
    const demo = fanWind.create({ canvas: { getContext: () => context }, overlay: { append() {} }, setHint() {}, setStageLabel() {} });
    demo.resize({ width: 800, height: 480 });
    demo.setSettings({ autoMove: false });
    const render = (elapsed) => { calls.length = 0; decorations.length = 0; fanColors.length = 0; windCurves.length = 0; demo.render({ elapsed }); return calls; };
    const mouse = (x, y) => demo.pointer({ type: 'move', pointerType: 'mouse', pointerId: 1, x, y });
    assert.deepEqual(render(0).at(-1), { coords: [50, 210, 60, 60], color: 'rgb(255,255,255)' });
    assert.equal(calls.length, 2, '背景とカーソル以外の矩形は塗らない');
    assert.deepEqual(decorations, [], '文字・枠線・点線を描かない');
    const idleFanColors = [...fanColors];
    const initialWindCurves = [...windCurves];
    assert.ok(initialWindCurves.length > 0, 'ファンの前に風の曲線を描く');
    mouse(296, 240);
    const down = render(0).slice(-3);
    assert.equal(calls.length, 4, '領域に入ってもエリアの塗りは追加しない');
    assert.deepEqual(fanColors, idleFanColors, '進入でファンの色を強調しない');
    assert.deepEqual(windCurves, initialWindCurves, '進入しても風のイラストは変わらない');
    assert.deepEqual(down.map((call) => call.color), ['rgb(255,255,255)', 'rgb(255,255,255)', 'rgb(0,0,0)']);
    assert.deepEqual(down[0].coords, [266, 210, 60, 60], '入力位置から力によるずれを加えない');
    assert.equal(down[1].coords[3], 1.5, '標準のエッジ幅は60pxの2.5%');
    assert.equal(render(.25).at(-3).color, 'rgb(0,0,0)', 'エリア内では中央も変調する');
    assert.deepEqual(windCurves, initialWindCurves, '時間が進んでも風の曲線は動かない');
    mouse(544, 240);
    assert.deepEqual(render(.25).slice(-3).map((call) => call.color), ['rgb(0,0,0)', 'rgb(255,255,255)', 'rgb(0,0,0)'], 'エリア間でも点滅位相を維持する');
    const before = render(.3125).slice(-3);
    demo.setSettings({ frequency: 4 });
    assert.deepEqual(render(.3125).slice(-3), before, '周波数変更時の位相は連続');
    mouse(430, 240);
    const outside = render(.5).at(-1);
    assert.equal(calls.length, 2, '領域外ではエッジを描かず全体が一様に点滅する');
    const laterOutside = render(.5625).at(-1);
    assert.notEqual(laterOutside.color, outside.color, '領域外も時間とともに明るさが変わる');
    assert.deepEqual(laterOutside.coords, outside.coords, '点滅で座標は変化しない');
    assert.deepEqual(render(1).at(-1).coords, outside.coords, '風の力による自動移動はない');
    demo.pointer({ type: 'move', pointerType: 'touch', pointerId: 2, x: 296, y: 240 });
    assert.deepEqual(render(1).at(-1).coords, outside.coords, 'タッチは押しているときだけ操作する');
    const beforeEntryColor = calls.at(-1).color;
    demo.pointer({ type: 'down', pointerType: 'touch', pointerId: 2, x: 296, y: 240 });
    assert.deepEqual(render(1).at(-3).coords, [266, 210, 60, 60]);
    assert.equal(calls.at(-3).color, beforeEntryColor, 'エリアに入っても中央の点滅は連続する');
    demo.suspend();
    demo.pointer({ type: 'move', pointerType: 'touch', pointerId: 2, x: 700, y: 240 });
    assert.deepEqual(render(1).at(-3).coords, [266, 210, 60, 60], '一時停止でタッチ操作を解除');
    demo.setSettings({ cursorSize: 80, edgePercent: 10 });
    const sized = render(1).slice(-3);
    assert.deepEqual(sized[0].coords, [256, 200, 80, 80]);
    assert.equal(sized[1].coords[3], 8);
    demo.reset();
    assert.deepEqual(render(0).at(-1).coords, [40, 200, 80, 80]);
    assert.equal(calls.at(-1).color, 'rgb(255,255,255)', 'リセットで位相も初期化');
    demo.key({ key: 'ArrowRight', shiftKey: true });
    assert.deepEqual(render(0).at(-1).coords, [64, 200, 80, 80]);
    demo.resize({ width: 320, height: 420 });
    mouse(320, 210);
    const edge = render(0).at(-1).coords;
    assert.equal(edge[0] + edge[2], 312, '表示端を越えない');
    demo.dispose();
});

function automaticHarness() {
  const rects = [], curves = [], texts = [], arcs = [], hints = [];
  const ctx = new Proxy({}, {
    get(target, key) {
      if (key === 'fillRect') return (...coords) => rects.push({ coords, color: target.fillStyle });
      if (key === 'bezierCurveTo') return (...args) => curves.push(args);
      if (key === 'fillText') return (...args) => texts.push(args);
      if (key === 'arc') return (...args) => arcs.push(args);
      return () => {};
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  const instance = fanWind.create({ canvas: { getContext: () => ctx }, setStageLabel() {}, setHint: (hint) => hints.push(hint) });
  instance.resize({ width: 800, height: 480 });
  const render = (elapsed = 0) => {
    rects.length = curves.length = texts.length = arcs.length = 0;
    instance.render({ elapsed });
    return structuredClone({ rects, curves, texts, arcs });
  };
  return { instance, render, hints };
}

test('ファンも自動往復ON・50px/sで始まり、往復中も固定した風の向きを提示する', () => {
  const defaults = Object.fromEntries(fanWind.settings.map((item) => [item.key, item.default]));
  assert.equal(defaults.autoMove, true); assert.equal(defaults.autoSpeed, 50);
  const { instance, render } = automaticHarness();
  const initial = render();
  assert.deepEqual(initial.rects[1].coords, [50, 210, 60, 60]);
  assert.equal(initial.texts.length, 0, 'START・GOALを含め、キャンバスに文字を描かない');
  assert.equal(initial.arcs.length, 4, '2個のファンの外周と中心だけで、ゴールの丸印はない');
  assert.ok(Math.abs(render(1).rects[1].coords[0] - 100) < 1e-10, '初期速度で1秒間に50px進む');
  instance.reset(); instance.setSettings({ autoSpeed: 100 }); render();
  const down = render(2);
  assert.ok(Math.abs(down.rects[1].coords[0] - 250) < 1e-10);
  assert.deepEqual(down.rects.slice(1).map((r) => r.color), ['rgb(255,255,255)', 'rgb(255,255,255)', 'rgb(0,0,0)']);
  const up = render(4.5);
  assert.ok(Math.abs(up.rects[1].coords[0] - 500) < 1e-10);
  assert.deepEqual(up.rects.slice(1).map((r) => r.color), ['rgb(255,255,255)', 'rgb(0,0,0)', 'rgb(255,255,255)']);
  const returnUp = render(9);
  assert.ok(Math.abs(returnUp.rects[1].coords[0] - 514) < 1e-10, '右端で折り返して戻る');
  assert.deepEqual(returnUp.rects.slice(1).map((r) => r.color), up.rects.slice(1).map((r) => r.color), '引き返しても同じエリアの風向きは変えない');
  const returnDown = render(11.5);
  assert.ok(Math.abs(returnDown.rects[1].coords[0] - 264) < 1e-10);
  assert.deepEqual(returnDown.rects.slice(1).map((r) => r.color), down.rects.slice(1).map((r) => r.color));
  for (const state of [down, up, returnUp, returnDown]) {
    assert.deepEqual(state.curves, initial.curves, '自動往復しても風のイラストは静止');
    assert.deepEqual(state.texts, []);
  }
});

test('ファンの自動往復も手動入力を無視し、一時停止・速度変更・モード切替で位相を保つ', () => {
  const { instance, render, hints } = automaticHarness();
  render(); const before = render(.5);
  instance.pointer({ type: 'move', pointerType: 'mouse', x: 500, y: 20, pointerId: 1 });
  instance.key({ key: 'ArrowLeft', shiftKey: true });
  assert.deepEqual(render(.5), before);
  instance.suspend(); assert.deepEqual(render(.5), before);
  instance.setSettings({ autoSpeed: 100 }); assert.deepEqual(render(.5), before);
  assert.ok(Math.abs(render(1).rects[1].coords[0] - 125) < 1e-10);
  instance.setSettings({ autoMove: false });
  instance.pointer({ type: 'move', pointerType: 'mouse', x: 296, y: 100, pointerId: 1 });
  const manual = render(1);
  assert.deepEqual(manual.rects[1].coords, [266, 70, 60, 60]);
  instance.setSettings({ autoMove: true });
  const automatic = render(1);
  assert.deepEqual(automatic.rects[1].coords, [266, 210, 60, 60], '自動モードでは中央の高さに戻る');
  assert.equal(automatic.rects[1].color, manual.rects[1].color, 'モード切替で位相を初期化しない');
  setLanguage('en'); instance.localize();
  assert.deepEqual(render(1), automatic);
  assert.match(hints.at(-1), /^Automatic motion/);
  instance.reset(); instance.setSettings(Object.fromEntries(fanWind.settings.map((item) => [item.key, item.default])));
  assert.deepEqual(render().rects[1].coords, [50, 210, 60, 60]);
  assert.ok(Math.abs(render(1).rects[1].coords[0] - 100) < 1e-10);
  instance.dispose();
});
