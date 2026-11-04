import { demos, plannedSlots } from './demos/registry.js';

const $ = (id) => document.getElementById(id);
const player = $('player'), canvas = $('demo-canvas'), stage = $('stage');
let active = null, opener = null;

function thumbnail(kind, index) {
  const el = document.createElement('div');
  el.className = `thumbnail ${kind === 'bar' ? 'thumb-bar' : kind === 'wind' ? 'thumb-wind' : kind === 'rp' ? 'thumb-rp' : kind === 'input' ? 'thumb-input' : 'thumb-placeholder' + (index % 2 === 0 ? ' soft' : '')}`;
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = kind === 'bar' ? '<span class="bar-thumb"></span><span class="bar-thumb-pointer"></span>' : kind === 'wind' ? '<span class="wind-thumb-zone zone-down">✣<span>↓</span></span><span class="wind-thumb-zone zone-up"><span>↑</span>✣</span><span class="wind-thumb-cursor"></span>' : kind === 'rp' ? '<span class="rp-thumb-field"><span></span></span><span class="rp-thumb-arrow">↑</span>' : kind === 'input' ? '<span class="thumb-square"></span><span class="thumb-pointer"></span>' : '<span class="placeholder-shape">+</span>';
  const number = document.createElement('span'); number.className = 'thumb-index'; number.textContent = String(index + 1).padStart(2, '0');
  const tag = document.createElement('span'); tag.className = 'thumb-tag'; tag.textContent = kind === 'bar' ? 'EXPLORE AN APPARENT BEND' : kind === 'wind' ? 'MOVE THROUGH THE WIND' : kind === 'rp' ? 'CHOOSE A DIRECTION' : kind === 'input' ? 'DRAG & EXPLORE' : 'OPEN FOR EXPLORATION';
  el.append(number, tag); return el;
}
function card(demo, index) {
  const el = document.createElement(demo ? 'button' : 'article');
  el.className = `demo-card ${demo ? 'live' : 'placeholder-card'}`;
  if (demo) { el.type = 'button'; el.setAttribute('aria-label', `${demo.title}を開く`); el.addEventListener('click', () => openDemo(demo.id, el)); }
  el.append(thumbnail(demo?.thumbnail || 'placeholder', index));
  const body = document.createElement('div'); body.className = 'card-body';
  const meta = document.createElement('div'); meta.className = 'card-meta';
  const kind = document.createElement('span'); kind.className = 'card-kind'; kind.textContent = demo?.kind || 'NEXT EXPLORATION';
  const status = document.createElement('span'); status.className = 'pill' + (demo ? '' : ' muted-pill'); status.textContent = demo ? demo.badge || 'デモ' : '準備中';
  meta.append(kind, status);
  const title = document.createElement('h3'); title.textContent = demo?.title || '次の体験のために';
  const description = document.createElement('p'); description.textContent = demo?.description || 'コンテンツが決まり次第、ここに新しいデモを追加します。';
  body.append(meta, title, description); el.append(body);
  const bottom = document.createElement('div'); bottom.className = 'card-bottom';
  const label = document.createElement('span'); label.textContent = demo ? 'デモを開く' : '内容・公開時期は未定';
  bottom.append(label);
  if (demo) { const arrow = document.createElement('span'); arrow.className = 'card-action'; arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true'); bottom.append(arrow); }
  el.append(bottom); return el;
}
demos.forEach((demo, i) => $('demo-grid').append(card(demo, i)));
for (let i = 0; i < plannedSlots; i++) $('demo-grid').append(card(null, demos.length + i));
document.querySelector('.section-count').textContent = String(demos.length).padStart(2, '0');

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
  $('toggle-play').textContent = running ? '一時停止 Ⅱ' : active.started ? '再開する ↗' : '開始する ↗';
  $('fullscreen-pause').textContent = running ? '一時停止' : '再開する';
  $('stage-status').textContent = running ? '表示中' : active.started ? '一時停止中' : '待機中';
  $('stage-help').textContent = running ? active.demo.hint || '説明に沿って操作してください' : active.demo.startOnArrow ? '矢印ボタンを押すと、その方向の刺激を表示します' : '「開始する」または「再開する」で操作を有効にする';
}
function settingsFor(demo) {
  const values = {}, container = $('settings'); container.replaceChildren();
  for (const setting of demo.settings) {
    values[setting.key] = setting.default;
    const label = document.createElement(setting.type === 'checkbox' ? 'label' : 'div'); label.className = 'setting';
    const input = document.createElement('input'); input.type = setting.type; input.name = setting.key;
    if (setting.type === 'checkbox') {
      label.classList.add('check-setting'); input.checked = setting.default;
      label.append(input, document.createTextNode(setting.label));
    } else {
      const row = document.createElement('span'); row.className = 'setting-label';
      const name = document.createElement('label'); name.textContent = setting.label;
      const output = document.createElement('output'); output.textContent = setting.default + (setting.unit || '');
      input.id = `setting-${demo.id}-${setting.key}`; output.htmlFor = input.id;
      name.htmlFor = input.id;
      input.setAttribute('aria-label', setting.label);
      input.min = setting.min; input.max = setting.max; input.step = setting.step; input.value = setting.default;
      const track = document.createElement('div'); track.className = 'setting-track';
      const marker = document.createElement('span'); marker.className = 'setting-default-marker'; marker.setAttribute('aria-hidden', 'true');
      const ratio = (setting.default - setting.min) / (setting.max - setting.min);
      marker.style.left = `calc(${ratio * 100}% + ${8 - 16 * ratio}px)`;
      track.append(input, marker);
      const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'setting-default-button';
      reset.textContent = `初期値 ${setting.default}${setting.unit || ''}`;
      reset.setAttribute('aria-label', `${setting.label}を初期値に戻す`);
      reset.addEventListener('click', () => {
        input.value = setting.default;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      row.append(name, output); label.append(row, track, reset);
      input.addEventListener('input', () => { output.textContent = input.value + (setting.unit || ''); });
    }
    input.addEventListener('input', () => {
      values[setting.key] = setting.type === 'checkbox' ? input.checked : Number(input.value);
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
  cleanup(); opener = trigger || document.querySelector('.demo-card.live');
  $('player-title').textContent = demo.title;
  $('player-number').textContent = String(demos.indexOf(demo) + 1).padStart(2, '0');
  $('player-description').textContent = demo.description; $('player-note').textContent = demo.note; $('player-message').textContent = '';
  $('player-badge').textContent = demo.badge || 'デモ'; $('stage-label').textContent = demo.stageLabel || demo.kind;
  stage.classList.toggle('rp-stage', demo.id === 'perpetual-square');
  stage.classList.toggle('wind-stage', demo.stageClass === 'wind-stage');
  stage.classList.toggle('bar-stage', demo.stageClass === 'bar-stage');
  $('settings-heading').hidden = demo.settings.length === 0;
  $('demo-overlay').replaceChildren();
  canvas.setAttribute('aria-label', demo.canvasLabel || `${demo.title}の操作領域。操作方法は説明を参照。`);
  const values = settingsFor(demo);
  if (!player.open) player.showModal();
  try {
    const instance = demo.create({ canvas, overlay: $('demo-overlay'), start: () => setRunning(true), invalidate: render, setHint: (text) => { $('stage-help').textContent = text; }, setStageLabel: (text) => { $('stage-label').textContent = text; } });
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
    cleanup(); $('player-message').textContent = 'このデモを開始できません。ページを再読み込みするか、別のブラウザでお試しください。';
    $('stage-status').textContent = '読み込みエラー'; $('toggle-play').disabled = true; $('reset-demo').disabled = true;
    console.error(error);
  }
}
$('toggle-play').addEventListener('click', () => { if (active) { setRunning(!active.running); if (active.running) canvas.focus({ preventScroll: true }); } });
$('reset-demo').addEventListener('click', () => {
  if (!active) return;
  setRunning(false); active.started = false; active.elapsed = 0; active.instance.reset(); active.values = settingsFor(active.demo);
  active.instance.setSettings({ ...active.values }); setRunning(false); $('player-message').textContent = ''; render();
});
$('close-player').addEventListener('click', () => player.close());
player.addEventListener('cancel', (event) => { if (document.fullscreenElement) { event.preventDefault(); document.exitFullscreen().catch(() => {}); } });
player.addEventListener('close', () => { cleanup(); history.replaceState(null, '', '#collection'); opener?.focus({ preventScroll: true }); });
$('fullscreen-pause').addEventListener('click', () => { if (active) setRunning(!active.running); });
$('fullscreen-exit').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); });
$('fullscreen').disabled = !document.fullscreenEnabled;
$('fullscreen').addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else { await stage.requestFullscreen(); canvas.focus(); } }
  catch { $('player-message').textContent = 'この環境では全画面表示を利用できません。'; }
});
document.addEventListener('fullscreenchange', () => { $('fullscreen').textContent = document.fullscreenElement ? '全画面を終了' : '全画面 ⛶'; resize(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && active?.running) setRunning(false); });
window.addEventListener('blur', () => { if (active?.running) setRunning(false); });
window.addEventListener('pagehide', cleanup);
function followHash() { const match = location.hash.match(/^#demo\/([a-z0-9-]+)$/); if (match) openDemo(match[1]); else if (player.open) player.close(); }
window.addEventListener('hashchange', followHash); followHash();
