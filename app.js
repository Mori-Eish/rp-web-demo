import { demos, plannedSlots } from './demos/registry.js';
import { t, getLanguage, setLanguage, localizeDemo } from './i18n.js';

try { setLanguage(localStorage.getItem('rp-demo-language')); } catch { /* 保存不可でも切替可能。 */ }

const $ = (id) => document.getElementById(id);
const player = $('player'), canvas = $('demo-canvas'), stage = $('stage');
let active = null, opener = null, messageKey = null, failed = false;

function thumbnail(kind, index) {
  const el = document.createElement('div');
  el.className = `thumbnail ${kind === 'lifting' ? 'thumb-lifting' : kind === 'directions' ? 'thumb-directions' : kind === 'bar' ? 'thumb-bar' : kind === 'wind' ? 'thumb-wind' : kind === 'rp' ? 'thumb-rp' : kind === 'input' ? 'thumb-input' : 'thumb-placeholder' + (index % 2 === 0 ? ' soft' : '')}`;
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = kind === 'lifting' ? '<span></span><span></span><span></span>' : kind === 'directions' ? '<span class="directions-thumb"><span>→</span><span>←</span><span>→</span><span>←</span></span>' : kind === 'bar' ? '<span class="bar-thumb"></span><span class="bar-thumb-pointer"></span>' : kind === 'wind' ? '<span class="wind-thumb-zone zone-down">✣<span>↓</span></span><span class="wind-thumb-zone zone-up"><span>↑</span>✣</span><span class="wind-thumb-cursor"></span>' : kind === 'rp' ? '<span class="rp-thumb-field"><span></span></span><span class="rp-thumb-arrow">↑</span>' : kind === 'input' ? '<span class="thumb-square"></span><span class="thumb-pointer"></span>' : '<span class="placeholder-shape">+</span>';
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
  const title = document.createElement('h2'); title.textContent = demo?.title || t('collection.next');
  const description = document.createElement('p'); description.textContent = demo?.description || t('collection.placeholder');
  body.append(meta, title, description); el.append(body);
  const bottom = document.createElement('div'); bottom.className = 'card-bottom';
  const label = document.createElement('span'); label.textContent = demo ? t('collection.open') : t('collection.tbd');
  bottom.append(label);
  if (demo) { const arrow = document.createElement('span'); arrow.className = 'card-action'; arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true'); bottom.append(arrow); }
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
  $('player-badge').textContent = copy.badge || t('player.demo');
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
function settingsFor(demo, initialValues = {}) {
  const values = {}, container = $('settings'); container.replaceChildren();
  for (const setting of demo.settings) {
    values[setting.key] = initialValues[setting.key] ?? setting.default;
    const isSelect = setting.type === 'select';
    const label = document.createElement(setting.type === 'range' ? 'div' : 'label'); label.className = 'setting';
    const input = document.createElement(isSelect ? 'select' : 'input');
    if (!isSelect) input.type = setting.type;
    input.name = setting.key;
    if (setting.type === 'checkbox') {
      label.classList.add('check-setting'); input.checked = values[setting.key];
      label.append(input, document.createTextNode(setting.label));
    } else if (isSelect) {
      const name = document.createElement('span'); name.className = 'setting-label'; name.textContent = setting.label;
      for (const { value, labelKey } of setting.options) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = t(labelKey);
        input.append(option);
      }
      input.value = values[setting.key];
      label.append(name, input);
    } else {
      const row = document.createElement('span'); row.className = 'setting-label';
      const name = document.createElement('label'); name.textContent = setting.label;
      const output = document.createElement('output'); output.textContent = values[setting.key] + (setting.unit || '');
      input.id = `setting-${demo.id}-${setting.key}`; output.htmlFor = input.id;
      name.htmlFor = input.id;
      input.setAttribute('aria-label', setting.label);
      input.min = setting.min; input.max = setting.max; input.step = setting.step; input.value = values[setting.key];
      const track = document.createElement('div'); track.className = 'setting-track';
      const marker = document.createElement('span'); marker.className = 'setting-default-marker'; marker.setAttribute('aria-hidden', 'true');
      const ratio = (setting.default - setting.min) / (setting.max - setting.min);
      marker.style.left = `calc(${ratio * 100}% + ${8 - 16 * ratio}px)`;
      track.append(input, marker);
      const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'setting-default-button';
      reset.textContent = t('setting.default', { value: setting.default, unit: setting.unit || '' });
      reset.setAttribute('aria-label', t('setting.reset', { label: setting.label }));
      reset.addEventListener('click', () => {
        input.value = setting.default;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      row.append(name, output); label.append(row, track, reset);
      input.addEventListener('input', () => { output.textContent = input.value + (setting.unit || ''); });
    }
    input.addEventListener(isSelect ? 'change' : 'input', () => {
      if (setting.type === 'checkbox') values[setting.key] = input.checked;
      else if (isSelect) values[setting.key] = input.value;
      else values[setting.key] = Number(input.value);
      if (active) { active.instance.setSettings({ ...values }); render(); }
    });
    container.append(label);
  }
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
  $('player-number').textContent = String(demos.indexOf(demo) + 1).padStart(2, '0');
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
    const instance = demo.create({ canvas, overlay: $('demo-overlay'), start: () => setRunning(true), invalidate: render, setHint: (text) => { if (active?.running) $('stage-help').textContent = text; }, setStageLabel: (text) => { $('stage-label').textContent = text; } });
    const events = new AbortController(), observer = new ResizeObserver(resize);
    active = { instance, events, observer, values, demo, running: false, started: false, elapsed: 0, lastTime: null, raf: 0 };
    resize(); instance.setSettings({ ...values }); setRunning(false); observer.observe(stage);
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
