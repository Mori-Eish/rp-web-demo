import { demos, plannedSlots } from './demos/registry.js';
import { t, getLanguage, setLanguage, localizeDemo } from './i18n.js';

try { setLanguage(localStorage.getItem('rp-demo-language')); } catch { /* 保存不可でも切替可能。 */ }

const $ = (id) => document.getElementById(id);
const player = $('player'), canvas = $('demo-canvas'), stage = $('stage');
let active = null, opener = null, messageKey = null, failed = false;

function thumbnail(kind, index) {
  const el = document.createElement('div');
  const hasSingleShape = ['donut', 'tiles', 'donut-tiles', 'pulling'].includes(kind);
  el.className = `thumbnail ${hasSingleShape ? `thumb-${kind}` : kind === 'lifting' ? 'thumb-lifting' : kind === 'directions' ? 'thumb-directions' : kind === 'bar' ? 'thumb-bar' : kind === 'wind' ? 'thumb-wind' : kind === 'rp' ? 'thumb-rp' : kind === 'input' ? 'thumb-input' : 'thumb-placeholder' + (index % 2 === 0 ? ' soft' : '')}`;
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = hasSingleShape ? '<span></span>' : kind === 'lifting' ? '<span></span><span></span><span></span>' : kind === 'directions' ? '<span class="directions-thumb"><span>→</span><span>←</span><span>→</span><span>←</span></span>' : kind === 'bar' ? '<span class="bar-thumb"></span><span class="bar-thumb-pointer"></span>' : kind === 'wind' ? '<span class="wind-thumb-zone zone-down">✣<span>↓</span></span><span class="wind-thumb-zone zone-up"><span>↑</span>✣</span><span class="wind-thumb-cursor"></span>' : kind === 'rp' ? '<span class="rp-thumb-field"><span></span></span><span class="rp-thumb-arrow">↑</span>' : kind === 'input' ? '<span class="thumb-square"></span><span class="thumb-pointer"></span>' : '<span class="placeholder-shape">+</span>';
  return el;
}
function card(demo, index) {
  demo = demo ? localizeDemo(demo) : null;
  const el = document.createElement(demo ? 'button' : 'article');
  el.className = `demo-card ${demo ? 'live' : 'placeholder-card'}`;
  if (demo) { el.id = `card-${demo.id}`; el.type = 'button'; el.setAttribute('aria-label', t('collection.openDemo', { title: demo.title })); el.addEventListener('click', () => openDemo(demo.id, el)); }
  el.append(thumbnail(demo?.thumbnail || 'placeholder', index));
  const body = document.createElement('div'); body.className = 'card-body';
  const meta = document.createElement('div'); meta.className = 'card-meta';
  const status = document.createElement('span'); status.className = 'pill' + (demo ? '' : ' muted-pill'); status.textContent = demo ? demo.badge || t('player.demo') : t('collection.upcoming');
  meta.append(status);
  const title = document.createElement('h3'); title.textContent = demo?.title || t('collection.next');
  const description = document.createElement('p'); description.textContent = demo?.description || t('collection.placeholder');
  body.append(meta, title, description); el.append(body);
  const bottom = document.createElement('div'); bottom.className = 'card-bottom';
  const label = document.createElement('span');
  label.textContent = demo ? '↗' : t('collection.tbd');
  if (demo) { label.className = 'card-action'; label.setAttribute('aria-hidden', 'true'); }
  bottom.append(label);
  el.append(bottom); return el;
}
function refreshGallery() {
  $('demo-grid').replaceChildren();
  demos.forEach((demo, i) => $('demo-grid').append(card(demo, i)));
  for (let i = 0; i < plannedSlots; i++) $('demo-grid').append(card(null, demos.length + i));
  document.querySelector('.section-count').textContent = t('collection.count', { count: demos.length });
}
function applyDemoText(demo) {
  const copy = localizeDemo(demo);
  $('player-title').textContent = copy.title;
  $('player-description').textContent = copy.description; $('player-note').textContent = copy.note;
  canvas.setAttribute('aria-label', copy.canvasLabel || t('player.canvas', { title: copy.title }));
}
function updateTransport() {
  if (!active) return;
  const demo = localizeDemo(active.demo), running = active.running;
  $('toggle-play').textContent = t(running ? 'player.pause' : active.started ? 'player.resume' : 'player.start');
  $('fullscreen-pause').textContent = t(running ? 'player.pauseShort' : 'player.resumeShort');
  $('stage-status').textContent = t(running ? 'player.running' : active.started ? 'player.paused' : 'player.waiting');
  $('stage-help').textContent = running ? demo.hint || t('player.hint') : t(demo.startOnArrow ? 'player.arrowReady' : 'player.ready');
  active.instance.localize?.();
}
function updatePageLanguage() {
  document.documentElement.lang = getLanguage();
  document.title = t('site.title');
  document.querySelector('meta[name="description"]').content = t('site.description');
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-aria-label]')) el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
  for (const button of document.querySelectorAll('[data-language-toggle]')) {
    const english = getLanguage() === 'en';
    button.textContent = english ? '日本語' : 'English'; button.lang = english ? 'ja' : 'en';
    button.setAttribute('aria-label', english ? '日本語に切り替える' : 'Switch to English');
  }
  refreshGallery();
  if (active) {
    applyDemoText(active.demo);
    active.values = settingsFor(localizeDemo(active.demo), active.values);
    updateTransport(); render();
  } else {
    $('stage-status').textContent = t(failed ? 'player.errorStatus' : 'player.waiting');
    $('toggle-play').textContent = t('player.start');
    $('fullscreen-pause').textContent = t('player.pauseShort');
  }
  $('player-message').textContent = messageKey ? t(messageKey) : '';
  $('fullscreen').textContent = t(document.fullscreenElement ? 'player.exitFullscreen' : 'player.fullscreen');
}

function render() {
  if (active) active.instance.render({ elapsed: active.elapsed, delta: 0 });
}
function resize() {
  if (!active) return;
  const rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
  canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  active.instance.resize({ width: rect.width, height: rect.height, dpr }); render();
}
function frame(time) {
  if (!active?.running) return;
  const delta = active.lastTime === null ? 0 : Math.min((time - active.lastTime) / 1000, 0.1);
  active.lastTime = time; active.elapsed += delta;
  active.instance.render({ elapsed: active.elapsed, delta });
  active.raf = requestAnimationFrame(frame);
}
function setRunning(running) {
  if (!active) return;
  active.running = running; active.lastTime = null;
  stage.dataset.running = String(running);
  cancelAnimationFrame(active.raf);
  if (running) { active.started = true; active.raf = requestAnimationFrame(frame); }
  else { active.instance.suspend?.(); render(); }
  updateTransport();
}
const automaticOptions = [
  { value: true, labelKey: 'setting.automatic' },
  { value: false, labelKey: 'setting.manual' },
];

function segmentedSetting(id, title, options, selected, change) {
  const group = document.createElement('fieldset'); group.className = 'setting setting-segmented';
  const legend = document.createElement('legend'); legend.textContent = title;
  const choices = document.createElement('div'); choices.className = 'segmented-options';
  choices.style.setProperty('--option-count', options.length);
  for (const { value, labelKey } of options) {
    const label = document.createElement('label');
    const radio = document.createElement('input'); radio.type = 'radio'; radio.name = id;
    radio.value = value; radio.checked = value === selected;
    radio.addEventListener('change', () => { if (radio.checked) change(value); });
    const text = document.createElement('span'); text.textContent = t(labelKey);
    label.append(radio, text); choices.append(label);
  }
  group.append(legend, choices);
  return group;
}

function switchSetting(title, checked, change) {
  const label = document.createElement('label'); label.className = 'setting setting-switch';
  const name = document.createElement('span'); name.textContent = title;
  const control = document.createElement('span'); control.className = 'switch-control';
  const input = document.createElement('input'); input.type = 'checkbox'; input.checked = checked;
  input.setAttribute('role', 'switch');
  const track = document.createElement('span'); track.className = 'switch-track'; track.setAttribute('aria-hidden', 'true');
  const state = document.createElement('span'); state.className = 'switch-state'; state.setAttribute('aria-hidden', 'true');
  state.textContent = checked ? 'ON' : 'OFF';
  input.addEventListener('change', () => {
    state.textContent = input.checked ? 'ON' : 'OFF';
    change(input.checked);
  });
  control.append(input, track, state); label.append(name, control);
  return label;
}

function selectSetting(title, options, selected, change) {
  const label = document.createElement('label'); label.className = 'setting';
  const name = document.createElement('span'); name.className = 'setting-label'; name.textContent = title;
  const input = document.createElement('select');
  for (const { value, labelKey } of options) input.add(new Option(t(labelKey), value));
  input.value = selected;
  input.addEventListener('change', () => change(input.value));
  label.append(name, input);
  return label;
}

function rangeSetting(id, setting, selected, change) {
  const field = document.createElement('div'); field.className = 'setting setting-range';
  const row = document.createElement('div'); row.className = 'setting-label';
  const name = document.createElement('label'); name.htmlFor = id; name.textContent = setting.label;
  const output = document.createElement('output'); output.htmlFor = id; output.setAttribute('aria-hidden', 'true');
  const input = document.createElement('input'); input.type = 'range'; input.id = id;
  input.min = setting.min; input.max = setting.max; input.step = setting.step; input.value = selected;
  const track = document.createElement('div'); track.className = 'setting-track';
  const marker = document.createElement('span'); marker.className = 'setting-default-marker'; marker.setAttribute('aria-hidden', 'true');
  const ratio = (setting.default - setting.min) / (setting.max - setting.min);
  marker.style.left = `calc(${ratio * 100}% + ${8 - 16 * ratio}px)`;
  const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'setting-default-button';
  const unit = setting.unit || '';
  reset.textContent = t('setting.default', { value: setting.default, unit });
  reset.setAttribute('aria-label', t('setting.reset', { label: setting.label }));

  function showValue() {
    const value = input.value + unit;
    output.textContent = value;
    input.setAttribute('aria-valuetext', value);
  }
  input.addEventListener('input', () => { showValue(); change(Number(input.value)); });
  reset.addEventListener('click', () => {
    input.value = setting.default;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  showValue();
  row.append(name, output); track.append(input, marker); field.append(row, track, reset);
  return field;
}

function settingsFor(demo, initialValues = {}) {
  const values = {}, container = $('settings'); container.replaceChildren();
  const ranges = document.createDocumentFragment();
  for (const setting of demo.settings) {
    const { key, label, type, options } = setting;
    const value = initialValues[key] ?? setting.default;
    values[key] = value;
    const id = `setting-${demo.id}-${key}`;
    const change = next => {
      values[key] = next;
      if (active) { active.instance.setSettings({ ...values }); render(); }
    };
    if (type === 'range') {
      ranges.append(rangeSetting(id, setting, value, change));
    } else if (type === 'select') {
      container.append(options.length <= 3 ? segmentedSetting(id, label, options, value, change) : selectSetting(label, options, value, change));
    } else if (key === 'autoMove' || key === 'autoScan') {
      container.append(segmentedSetting(id, t('setting.operationMode'), automaticOptions, value, change));
    } else {
      container.append(switchSetting(label, value, change));
    }
  }
  container.append(ranges);
  return values;
}
function cleanup() {
  if (!active) return;
  cancelAnimationFrame(active.raf); active.observer.disconnect(); active.events.abort(); active.instance.dispose?.(); active = null;
  $('demo-overlay').replaceChildren();
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
function openDemo(id, trigger) {
  const demo = demos.find((item) => item.id === id);
  if (!demo) return;
  cleanup(); opener = trigger?.id || `card-${demo.id}`; failed = false; messageKey = null;
  applyDemoText(demo);
  $('player-about').open = false;
  $('player-message').textContent = ''; $('stage-label').textContent = demo.stageLabel || demo.kind;
  stage.classList.toggle('rp-stage', demo.id === 'perpetual-square');
  stage.classList.toggle('wind-stage', demo.stageClass === 'wind-stage');
  stage.classList.toggle('bar-stage', demo.stageClass === 'bar-stage');
  stage.classList.toggle('lift-stage', demo.stageClass === 'lift-stage');
  $('settings-heading').hidden = demo.settings.length === 0;
  $('demo-overlay').replaceChildren();
  const values = settingsFor(localizeDemo(demo));
  if (!player.open) player.showModal();
  try {
    const instance = demo.create({ canvas, overlay: $('demo-overlay'), start: () => setRunning(true), invalidate: render, setHint: (text) => { if (active?.running) $('stage-help').textContent = text; }, setStageLabel: (text) => { $('stage-label').textContent = text; }, setNote: (text) => { $('player-note').textContent = text; } });
    const events = new AbortController(), observer = new ResizeObserver(resize);
    active = { instance, events, observer, values, demo, running: false, started: false, elapsed: 0, lastTime: null, raf: 0 };
    resize(); instance.setSettings({ ...values }); observer.observe(stage);
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) {
      canvas.addEventListener(type, (event) => {
        if (!active?.running || (event.type === 'pointerdown' && event.button !== 0)) return;
        const rect = canvas.getBoundingClientRect();
        const mappedType = { pointerdown: 'down', pointermove: 'move', pointerup: 'up', pointercancel: 'cancel', lostpointercapture: 'cancel' }[event.type];
        if (mappedType === 'down') { canvas.focus({ preventScroll: true }); canvas.setPointerCapture(event.pointerId); }
        instance.pointer?.({ type: mappedType, x: event.clientX - rect.left, y: event.clientY - rect.top, pointerId: event.pointerId, pointerType: event.pointerType });
      }, { signal: events.signal });
    }
    canvas.addEventListener('keydown', (event) => {
      if (event.key === ' ') { event.preventDefault(); setRunning(!active.running); return; }
      if (event.key.startsWith('Arrow')) { event.preventDefault(); if (demo.startOnArrow && !active.running) setRunning(true); if (active.running) instance.key?.({ key: event.key, shiftKey: event.shiftKey }); }
    }, { signal: events.signal });
    history.replaceState(null, '', `#demo/${demo.id}`);
    $('toggle-play').disabled = false; $('reset-demo').disabled = false;
    $('toggle-play').focus();
    setRunning(true);
  } catch (error) {
    cleanup(); failed = true; messageKey = 'player.loadError'; $('player-message').textContent = t(messageKey);
    $('stage-status').textContent = t('player.errorStatus'); $('toggle-play').disabled = true; $('reset-demo').disabled = true;
    console.error(error);
  }
}
$('toggle-play').addEventListener('click', () => { if (active) { setRunning(!active.running); if (active.running) canvas.focus({ preventScroll: true }); } });
$('reset-demo').addEventListener('click', () => {
  if (!active) return;
  setRunning(false); active.started = false; active.elapsed = 0; active.instance.reset(); active.values = settingsFor(localizeDemo(active.demo));
  active.instance.setSettings({ ...active.values }); setRunning(false); messageKey = null; $('player-message').textContent = ''; render();
});
$('close-player').addEventListener('click', () => player.close());
function isPlayerBackdrop(event) {
  if (event.target !== player || document.fullscreenElement) return false;
  const { left, right, top, bottom } = player.getBoundingClientRect();
  return event.clientX < left || event.clientX >= right || event.clientY < top || event.clientY >= bottom;
}

let backdropPressed = false;
player.addEventListener('pointerdown', (event) => {
  backdropPressed = event.isPrimary && event.button === 0 && isPlayerBackdrop(event);
});
player.addEventListener('pointercancel', () => { backdropPressed = false; });
player.addEventListener('click', (event) => {
  // Only dismiss when the press also began outside the dialog.
  const dismiss = backdropPressed && isPlayerBackdrop(event);
  backdropPressed = false;
  if (dismiss) player.close();
});
player.addEventListener('cancel', (event) => { if (document.fullscreenElement) { event.preventDefault(); document.exitFullscreen().catch(() => {}); } });
player.addEventListener('close', () => { cleanup(); history.replaceState(null, '', '#collection'); $(opener)?.focus({ preventScroll: true }); });
$('fullscreen-pause').addEventListener('click', () => { if (active) setRunning(!active.running); });
$('fullscreen-exit').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); });
$('fullscreen').disabled = !document.fullscreenEnabled;
$('fullscreen').addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else { await stage.requestFullscreen(); canvas.focus(); } }
  catch { messageKey = 'player.fullscreenError'; $('player-message').textContent = t(messageKey); }
});
document.addEventListener('fullscreenchange', () => { $('fullscreen').textContent = t(document.fullscreenElement ? 'player.exitFullscreen' : 'player.fullscreen'); resize(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && active?.running) setRunning(false); });
window.addEventListener('blur', () => { if (active?.running) setRunning(false); });
window.addEventListener('pagehide', cleanup);
function followHash() { const match = location.hash.match(/^#demo\/([a-z0-9-]+)$/); if (match) openDemo(match[1]); else if (player.open) player.close(); }
for (const button of document.querySelectorAll('[data-language-toggle]')) button.addEventListener('click', () => {
  setLanguage(getLanguage() === 'ja' ? 'en' : 'ja');
  try { localStorage.setItem('rp-demo-language', getLanguage()); } catch { /* 保存不可でも現在のページには反映。 */ }
  updatePageLanguage();
});
window.addEventListener('hashchange', followHash); updatePageLanguage(); followHash();
