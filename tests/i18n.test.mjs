import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { messages, t, getLanguage, setLanguage, localizeDemo } from '../dist/i18n.js';
import { demos } from '../dist/demos/registry.js';
import { perpetualSquare } from '../dist/demos/perpetual-square.js';

afterEach(() => setLanguage('ja'));

test('日英の翻訳キーと差し込み値が揃い、全デモの説明と設定を翻訳できる', () => {
  const keys = Object.keys(messages.ja).sort();
  assert.deepEqual(Object.keys(messages.en).sort(), keys);
  for (const key of keys) {
    assert.ok(messages.en[key].length > 0);
    const slots = (value) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    assert.deepEqual(slots(messages.en[key]), slots(messages.ja[key]), key);
  }
  setLanguage('en');
  assert.equal(t('setting.default', { value: 2.5, unit: ' %' }), 'Default 2.5 %');
  assert.equal(t('setting.reset', { label: 'Frequency' }), 'Reset Frequency to its default');
  for (const demo of demos) {
    const copy = localizeDemo(demo);
    for (const key of ['title', 'description', 'note', 'hint', 'canvasLabel', 'badge']) {
      assert.ok(copy[key]);
      assert.doesNotMatch(copy[key], /[\u3040-\u30ff\u3400-\u9fff]/u, `${demo.id}.${key}`);
    }
    assert.equal(copy.create, demo.create, '翻訳で実装を置き換えない');
    assert.equal(copy.id, demo.id);
    for (let i = 0; i < demo.settings.length; i++) {
      const { label, ...configuration } = copy.settings[i];
      const { label: original, ...expected } = demo.settings[i];
      assert.notEqual(label, original);
      assert.deepEqual(configuration, expected, '設定の範囲・刻み・初期値を維持する');
    }
  }
  setLanguage('ja');
  for (const demo of demos) assert.equal(localizeDemo(demo), demo);
  setLanguage('invalid'); assert.equal(getLanguage(), 'ja');
});

test('RP矢印の翻訳でも選択方向・設定・描画位相を維持する', () => {
  class Element {
    children = []; attrs = {}; handlers = {}; style = { setProperty() {} };
    setAttribute(key, value) { this.attrs[key] = value; }
    addEventListener(key, handler) { this.handlers[key] = handler; }
    append(...children) { this.children.push(...children); }
    remove() {}
  }
  const original = globalThis.document;
  globalThis.document = { createElement: () => new Element() };
  try {
    const overlay = new Element(), calls = [];
    const ctx = { clearRect() {}, fillRect(...coords) { calls.push({ coords, color: this.fillStyle }); } };
    let starts = 0, hint;
    const instance = perpetualSquare.create({ canvas: { getContext: () => ctx }, overlay, setHint(text) { hint = text; }, start() { starts++; }, invalidate() {} });
    instance.resize({ width: 800, height: 540 });
    instance.setSettings({ frequency: 3, sizePercent: 70, edgePercent: 8 });
    const group = overlay.children[0], [up, down, left, right, output] = group.children;
    right.handlers.click(); instance.render({ elapsed: .037 });
    const before = structuredClone(calls);
    setLanguage('en'); instance.localize(); calls.length = 0; instance.render({ elapsed: .037 });
    assert.equal(group.attrs['aria-label'], 'Apparent motion direction');
    assert.equal(right.attrs['aria-label'], 'Show apparent motion: Right');
    assert.equal(output.textContent, 'Direction: Right →');
    assert.equal(right.attrs['aria-pressed'], 'true');
    assert.equal(up.attrs['aria-pressed'], 'false');
    assert.equal(starts, 1, '翻訳時に再開・再初期化しない');
    assert.deepEqual(calls, before, '形状と位相は変わらない');
    assert.equal(hint, 'Choose a direction · The square stays in place');
    setLanguage('ja'); instance.localize();
    assert.equal(output.textContent, '選択方向：右 →');
    assert.equal(right.attrs['aria-label'], '右向きに見える刺激を表示');
    instance.dispose();
  } finally { globalThis.document = original; }
});
