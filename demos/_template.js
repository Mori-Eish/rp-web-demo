// 複製して id / title / 説明 / 実装を編集し、registry.js の demos に追加。
// このファイル自体は未登録なので画面に表示されません。
export const newDemo = {
  id: 'replace-this-id',
  title: 'デモのタイトル',
  description: '操作方法と、何を体験できるかを記入。',
  note: '検証状況・表示条件・制限を記入。',
  kind: 'EXPERIMENT',
  badge: '試作',
  stageLabel: 'NEW DEMO',
  hint: 'ここに操作ガイドを表示',
  canvasLabel: 'デモの操作領域。具体的な操作方法を記入。',
  thumbnail: 'input', // 現時点では共通サムネイル。必要に応じて app.js の thumbnail() を拡張。
  settings: [], // range または checkbox。定義例は input-sandbox.js を参照。
  create({ canvas, setHint }) {
    const ctx = canvas.getContext('2d');
    let width = 1, height = 1;
    setHint('ここに操作ガイドを表示');
    return {
      resize(view) { width = view.width; height = view.height; },
      setSettings(values) {},
      pointer(event) {}, // type: down/move/up/cancel, x/y: CSS px, pointerId, pointerType
      key(event) {}, // key, shiftKey
      render({ elapsed, delta }) { ctx.clearRect(0, 0, width, height); }, // 時間の単位は秒
      suspend() {}, // 一時停止・非表示・フォーカス喪失時のドラッグ等を解除
      reset() {},
      dispose() {}, // 自前で追加したイベント・リソースはここで解除
    };
  },
};
