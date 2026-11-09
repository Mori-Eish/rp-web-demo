export const messages = {
  ja: {
    'site.title': 'RP / PH Webデモ', 'site.home': 'RP / PH Webデモ ホーム',
    'site.description': 'Reversed Phi (RP) を用いた Pseudo-Haptics (PH) のブラウザデモ。',
    'collection.title': 'デモ一覧', 'collection.count': '{count}件', 'collection.skip': 'デモ一覧へスキップ',
    'collection.open': '開く', 'collection.openDemo': '{title}を開く',
    'collection.upcoming': '準備中', 'collection.next': '次の体験のために',
    'collection.placeholder': 'コンテンツが決まり次第、ここに新しいデモを追加します。', 'collection.tbd': '内容・公開時期は未定',
    'player.demo': 'デモ', 'player.close': 'デモを閉じる', 'player.settings': '設定',
    'player.controls': 'デモの説明と設定', 'player.about': 'このデモについて',
    'player.input': 'マウス・タッチ・キーボード対応', 'player.escape': 'Esc で閉じる',
    'player.canvas': '{title}の操作領域。操作方法は説明を参照。',
    'player.start': '開始する ↗', 'player.pause': '一時停止 Ⅱ', 'player.resume': '再開する ↗',
    'player.pauseShort': '一時停止', 'player.resumeShort': '再開する', 'player.reset': 'リセット',
    'player.fullscreen': '全画面 ⛶', 'player.exitFullscreen': '全画面を終了',
    'player.waiting': '待機中', 'player.running': '表示中', 'player.paused': '一時停止中',
    'player.hint': '説明に沿って操作してください',
    'player.ready': '「開始する」または「再開する」で操作を有効にする',
    'player.arrowReady': '矢印ボタンを押すと、その方向の刺激を表示します',
    'player.loadError': 'このデモを開始できません。ページを再読み込みするか、別のブラウザでお試しください。',
    'player.errorStatus': '読み込みエラー', 'player.fullscreenError': 'この環境では全画面表示を利用できません。',
    'setting.default': '初期値 {value}{unit}', 'setting.reset': '{label}を初期値に戻す',
    'setting.frequency': '周波数', 'setting.sizePercent': '刺激サイズ', 'setting.edgePercent': 'エッジ幅',
    'setting.cursorSize': 'カーソルサイズ', 'setting.lengthPercent': '棒の長さ', 'setting.maxDistance': '反応する距離',
    'setting.invertMode': '離れた部分を逆向きにする', 'setting.size': '四角形のサイズ', 'setting.guides': 'ガイドを表示',
    'rp.directions': '見かけの進行方向', 'rp.show': '{direction}向きに見える刺激を表示',
    'rp.selected': '選択方向：{direction} {arrow}', 'rp.hint': '矢印で方向を選択 · 四角形の位置は固定です',
    'direction.up': '上', 'direction.down': '下', 'direction.left': '左', 'direction.right': '右',
    'sandbox.dragging': 'ドラッグ中 · 指を離すと停止します', 'sandbox.hint': '四角形をドラッグ / 矢印キーで移動',
    'zones.same': '同方向', 'zones.opposite': '逆方向', 'zones.none': 'なし',
    'setting.autoMove': '自動で往復する', 'setting.autoSpeed': '自動移動の速度',
    'motion.autoHint': '一定速度で自動往復 · 一時停止で止められます',
    'fan.manualHint': 'マウスを動かす / タッチでドラッグ / 矢印キー',
    'setting.rpMode': 'RPの提示方向', 'setting.liftingRP': 'AとCのRPを表示する',
    'alternating.mode.alternating': '交互', 'alternating.mode.same': '同方向のみ', 'alternating.mode.opposite': '逆方向のみ',
    'alternating.manualHint': '左右に動かす · マウス / タッチでドラッグ / 左右の矢印キー',
  },
  en: {
    'site.title': 'RP / PH Web Demos', 'site.home': 'RP / PH Web Demos home',
    'site.description': 'Browser demos of Pseudo-Haptics (PH) using Reversed Phi (RP).',
    'collection.title': 'Demos', 'collection.count': '{count} demos', 'collection.skip': 'Skip to demos',
    'collection.open': 'Open', 'collection.openDemo': 'Open {title}',
    'collection.upcoming': 'Coming soon', 'collection.next': 'Upcoming demo',
    'collection.placeholder': 'New demos will be added here.', 'collection.tbd': 'Details and release date to be announced',
    'player.demo': 'Demo', 'player.close': 'Close demo', 'player.settings': 'Settings',
    'player.controls': 'Demo instructions and settings', 'player.about': 'About this demo',
    'player.input': 'Mouse, touch and keyboard', 'player.escape': 'Esc to close',
    'player.canvas': '{title} interaction area. See the instructions for controls.',
    'player.start': 'Start ↗', 'player.pause': 'Pause Ⅱ', 'player.resume': 'Resume ↗',
    'player.pauseShort': 'Pause', 'player.resumeShort': 'Resume', 'player.reset': 'Reset',
    'player.fullscreen': 'Fullscreen ⛶', 'player.exitFullscreen': 'Exit fullscreen',
    'player.waiting': 'Ready', 'player.running': 'Running', 'player.paused': 'Paused',
    'player.hint': 'Follow the instructions to interact.',
    'player.ready': 'Select Start or Resume to enable interaction.',
    'player.arrowReady': 'Select an arrow to display the stimulus in that direction.',
    'player.loadError': 'This demo could not start. Reload the page or try another browser.',
    'player.errorStatus': 'Loading error', 'player.fullscreenError': 'Fullscreen is unavailable in this environment.',
    'setting.default': 'Default {value}{unit}', 'setting.reset': 'Reset {label} to its default',
    'setting.frequency': 'Frequency', 'setting.sizePercent': 'Stimulus size', 'setting.edgePercent': 'Edge width',
    'setting.cursorSize': 'Cursor size', 'setting.lengthPercent': 'Bar length', 'setting.maxDistance': 'Response distance',
    'setting.invertMode': 'Reverse distant sections', 'setting.size': 'Square size', 'setting.guides': 'Show guides',
    'rp.directions': 'Apparent motion direction', 'rp.show': 'Show apparent motion: {direction}',
    'rp.selected': 'Direction: {direction} {arrow}', 'rp.hint': 'Choose a direction · The square stays in place',
    'direction.up': 'Up', 'direction.down': 'Down', 'direction.left': 'Left', 'direction.right': 'Right',
    'sandbox.dragging': 'Dragging · Release to stop', 'sandbox.hint': 'Drag the square / Move with arrow keys',
    'zones.same': 'Same', 'zones.opposite': 'Opposite', 'zones.none': 'No RP',
    'setting.autoMove': 'Automatic movement', 'setting.autoSpeed': 'Automatic speed',
    'motion.autoHint': 'Automatic motion at constant speed · Select Pause to stop',
    'fan.manualHint': 'Move the mouse / Touch and drag / Arrow keys',
    'setting.rpMode': 'RP direction', 'setting.liftingRP': 'Show RP on A and C',
    'alternating.mode.alternating': 'Alternating', 'alternating.mode.same': 'Same direction only', 'alternating.mode.opposite': 'Opposite direction only',
    'alternating.manualHint': 'Move left and right · Mouse / Touch and drag / Left and right arrow keys',
  },
};

const englishDemos = {
  'lifting-weight': {
    title: 'Lift the squares', badge: 'Prototype',
    description: 'Lift each of the three squares off the ground and compare how it feels.',
    note: 'From left to right, A displays upward RP, B blinks uniformly, and C displays downward RP. All three blink at the same rate, follow drag input the same way, and fall under the same gravity on release.',
    hint: 'Drag a square upward, then let go.',
    canvasLabel: 'Squares A, B, and C rest on the ground. Drag any square upward, or choose with Left and Right and lift with Up.',
  },
  'alternating-directions': {
    title: 'Same and opposite RP', badge: 'Interactive demo',
    description: 'See RP in the same or opposite direction as the cursor moves left and right.',
    note: 'Choose an RP direction. Alternating uses four areas from left to right: same, opposite, same, opposite. Same direction only presents RP in areas 1 and 3. Opposite direction only presents RP in areas 2 and 4. In the other areas, the entire cursor blinks uniformly. For manual control, use the mouse, touch and drag, or the left and right arrow keys.',
    hint: 'Move manually, or enable Automatic movement and press Start',
    canvasLabel: 'Four areas present same-direction RP, opposite-direction RP, or uniform blinking as the cursor moves horizontally.',
  },
  'perpetual-square': {
    title: 'RP motion', badge: 'Visual illusion',
    description: 'Select an arrow and observe whether the stationary square appears to move in that direction.',
    note: 'The background and square position stay fixed. Size is relative to the available area; edge width is relative to the square side.',
    hint: 'Choose a direction · The square stays in place',
    canvasLabel: 'Stationary square RP stimulus. Select a direction using the surrounding arrow buttons or keyboard arrow keys.',
  },
  'fan-wind': {
    title: 'Fan wind', badge: 'Interactive demo',
    description: 'The square cursor moves back and forth between the fans at constant speed.',
    note: 'Press Start for automatic horizontal motion. Disable Automatic movement to use the mouse, touch and drag, or arrow keys.',
    hint: 'Automatic motion, or use the mouse, touch and drag, or arrow keys',
    canvasLabel: 'Fan wind interaction area. Move the square automatically, or use the mouse, touch and drag, or arrow keys.',
  },
  'bending-bar': {
    title: 'Apparent bar bending', badge: 'Interactive demo',
    description: 'Move the mouse around the bar and observe how its appearance changes.',
    note: 'The bar position and shape stay fixed. Only luminance changes with the distance to the mouse. Touch and drag or use arrow keys to interact.',
    hint: 'Move near the bar · Mouse / Touch and drag / Arrow keys',
    canvasLabel: 'A vertical stack of 28 RP stimuli. Move near the bar using the mouse, touch and drag, or arrow keys.',
  },
  'input-sandbox': {
    title: 'Input sandbox', badge: 'Input check',
    description: 'Move the square to check browser input and rendering.',
    note: 'This sample does not present RP stimuli or resistance. The square follows your input while dragging. Reproduction of research stimuli requires separate validation.',
    hint: 'Drag the square / Move with arrow keys',
    canvasLabel: 'Drag the square to check input. Use keyboard arrow keys to move it.',
  },
};

let language = 'ja';
export function getLanguage() { return language; }
export function setLanguage(value) { language = value === 'en' ? 'en' : 'ja'; }
export function t(key, values = {}) {
  const template = messages[language][key] ?? messages.ja[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) => String(values[name] ?? match));
}
export function localizeDemo(demo) {
  if (language === 'ja') return demo;
  return {
    ...demo, ...englishDemos[demo.id],
    settings: demo.settings.map((setting) => ({ ...setting, label: messages.en[`setting.${setting.key}`] ?? setting.label })),
  };
}
