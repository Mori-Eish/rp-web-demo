import test from 'node:test';
import assert from 'node:assert/strict';
import { fanWind, windZoneAt, windZones } from '../dist/demos/fan-wind.js';

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
    const render = (elapsed) => { calls.length = 0; decorations.length = 0; fanColors.length = 0; windCurves.length = 0; demo.render({ elapsed }); return calls; };
    const mouse = (x, y) => demo.pointer({ type: 'move', pointerType: 'mouse', pointerId: 1, x, y });
    assert.deepEqual(render(0).at(-1), { coords: [50, 210, 60, 60], color: 'rgb(255,255,255)' });
    assert.equal(calls.length, 2, '背景とカーソル以外の矩形は塗らない');
    assert.deepEqual(decorations.map((entry) => entry[0]), ['fillText', 'fillText'], '枠線や点線は描かない');
    assert.deepEqual(decorations.map((entry) => entry[1]), ['START', 'GOAL'], '風向き・エリア状態の文字は描かない');
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
