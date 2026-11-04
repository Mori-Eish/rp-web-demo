# RP / PH Web Demo

Reversed Phi (RP) を用いた Pseudo-Haptics (PH) のブラウザデモです。RPは、輝度変化から方向性のある運動知覚を生じさせる錯視です。物理的な力を発生させるものではありません。

**公開サイト:** https://Mori-Eish.github.io/rp-web-demo/

## デモ

- **RPの動きを見る**: 位置を固定した四角形の見かけの進行方向を、上下左右の矢印で切り替えます。周波数・刺激サイズ・エッジ幅を調整できます。
- **ファンの風を受ける**: 四角いカーソルを左から右へ操作します。ファンの前では上下方向のRP刺激を提示し、領域外では一様に点滅します。風のイラストは静止しています。初期値は2 Hz・60 px・エッジ幅2.5%です。
- **インタラクション・サンドボックス**: マウス・タッチ・キーボード入力を確認する、RP刺激を含まないサンプルです。

デモは開始ボタンで再生します。タブ非表示やウィンドウのフォーカス喪失で自動停止します。各スライダーの初期値ボタンと、全体のリセットを利用できます。

これは体験用の試作です。風力感などの主観的な感覚の成立や強さを検証済みとするものではありません。研究用刺激の物理寸法・実測輝度・表示タイミングを厳密に再現するものでもありません。

## ローカルで起動

Node.js 22以上を推奨します。依存パッケージのインストールやビルドは不要です。

```sh
git clone https://github.com/Mori-Eish/rp-web-demo.git
cd rp-web-demo
npm start
```

ブラウザで http://127.0.0.1:4173/ を開きます。終了はターミナルで `Ctrl+C`。別のポートを使う場合は環境変数 `RP_DEMO_PORT` を設定してください。

```sh
npm test
```

テストは、このリポジトリ内のファイルだけで実行できます。

## GitHub Pagesへの公開・更新

GitHub Pagesは、専用の `gh-pages` ブランチのルートから配信します。このブランチには `dist/` の内容だけを配置します。GitHub側の Settings → Pages → Build and deployment は **Deploy from a branch / gh-pages / (root)** を使用します。

更新はこの専用リポジトリで行い、変更をcommitして `main` にpushした後、次を実行してください。

```sh
npm run deploy
```

テストが成功すると、commit済みの `dist/` を `gh-pages` にpushします。GitHub Pagesが公開サイトを更新します。未commitの変更は公開されません。`main` へのpushだけでは公開内容は更新されません。

研究資料・実験データ・研究リポジトリのGit履歴は、このリポジトリに含めていません。

## ファイル構成

```text
dist/                  公開するHTML・CSS・JavaScript・SVG
  demos/registry.js    一覧へのデモ登録
  demos/_template.js   新しいデモのテンプレート
serve.mjs              ローカル用静的サーバー
tests/                 描画・刺激系列・入力処理のテスト
```

新しいデモは `dist/demos/_template.js` を複製し、`dist/demos/registry.js` の配列へ追加します。

## 通信とデータ

外部API・CDN・解析サービスは使用していません。アプリから操作データを記録・送信する処理はありません。サイトのファイルはGitHub Pagesから配信されます。

## 参考

[VisualHaptics](https://keita-lab.jp/projects/VisualHaptics/) の、複数の体験を一覧から選ぶ導線を参考にしています。画像やソースコードは流用していません。
