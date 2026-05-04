# Next Chat Prompt: roBa Keymap Viewer

Use the following prompt at the start of the next chat.

```md
このリポジトリ `zmk-config-roBa` で、roBa 用 ZMK Studio 風ローカル補助アプリの続き作業を進めてください。
回答は日本語でお願いします。

## 最初に読むファイル

まず以下を読んで、現在の前提と制約を把握してください。

1. `AGENTS.md`
2. `docs/current-work-status.md`
3. `docs/zmk-studio-like-app-plan.md`
4. `docs/zmk-studio-like-app-phase0-research.md`
5. `docs/zmk-studio-like-app-keymap-editor-trial.md`
6. `docs/zmk-studio-like-app-claude-design-request.md`
7. `docs/zmk-studio-like-app-advanced-editing-ux-notes.md`

Claude Design の出力は以下に置いてあります。

- `docs/claude-design-roba-app/roBa Keymap App.html`
- `docs/claude-design-roba-app/tweaks-panel.jsx`
- `docs/claude-design-roba-app/components/KeyboardVisual.jsx`
- `docs/claude-design-roba-app/components/KeyDetail.jsx`
- `docs/claude-design-roba-app/components/TabPanels.jsx`
- `docs/claude-design-roba-app/data/keymapData.js`
- `docs/claude-design-roba-app/screenshots/main.png`
- `docs/claude-design-roba-app/uploads/roBa.json`
- `docs/claude-design-roba-app/uploads/roBa.keymap`

`uploads/roBa.json` と `uploads/roBa.keymap` は、配置確認時点では `config/roBa.json` / `config/roBa.keymap` と同一ハッシュでした。ただし正本は常に `config/` 側です。

## 現在の状態

- roBa は 43 キー split keyboard。
- 物理配置の第一候補 SSoT は `config/roBa.json`。
- キーマップ正本は `config/roBa.keymap`。
- Claude Design には `config/roBa.json` と `config/roBa.keymap` を渡し、roBa 43 キー配置を反映した read-only MVP 風モックアップが出力済み。
- Claude Design 出力は資料として `docs/claude-design-roba-app/` に置いてあり、現時点では Git 未追跡の可能性があります。
- MVP は ZMK Studio の完全代替ではなく、公式 ZMK Studio と併用するローカル Web 補助アプリです。

## 次にやりたいこと

Claude Design の出力を確認し、次のどちらに進むべきか判断してください。

1. まずモックアップ資料としてレビューし、UI / レイアウト / 表示内容の改善点を `docs/` にまとめる。
2. 実装に進める場合は、リポジトリ直下に `tools/roba-keymap-viewer/` を作り、Vite + React の read-only MVP として移植する。

実装に進む場合の初期スコープは以下です。

- `config/roBa.json` から 43 キー物理レイアウトを表示する。
- `config/roBa.keymap` を read-only で読み、layer ごとの binding を表示する。
- layer selector を用意する。
- key を選択すると binding detail を表示する。
- combos / macros / custom behaviors / sensor-bindings は、最初は一覧表示だけでよい。
- Markdown 出力プレビューを用意する。
- 編集、保存、ファームウェア直接反映は MVP に含めない。ボタンを置く場合は disabled または Phase 2+ 表示にする。

## 重要な制約

- `config/roBa.keymap` と `config/roBa.json` は正本なので、Claude Design の `uploads/` 内コピーを正本扱いしないでください。
- `config/west.yml` の revision は変更しないでください。
- `build.yaml` の `roBa_R` にある `snippet: studio-rpc-usb-uart` は消さないでください。
- `roBa_R.conf` の `CONFIG_ZMK_STUDIO=y` / `CONFIG_ZMK_STUDIO_LOCKING=n` は維持してください。
- `CONFIG_EC11` と `CONFIG_ZMK_POINTING` が左右両方の `.conf` にあることを、物理ハードウェア配置だけを理由に削除しないでください。
- 既存の numbered layer、特に `layer_6` は勝手にリネームしないでください。
- keymap を変更する作業ではない限り、`keymap-drawer/roBa.yaml` / `keymap-drawer/roBa.svg` は触らないでください。

## 実装方針メモ

- 最初の実装候補は `tools/roba-keymap-viewer/`。
- Vite + React を優先。
- 初期 MVP は read-only。
- `.keymap` 編集は Phase 2 以降。
- `.keymap` 編集に入る場合は、AST 全体再生成ではなく source range / slice replacement ベースを検討してください。
- 保存前に差分表示、parse -> serialize で差分なし、1 キー変更で対象 binding 以外を変えない検証を重視してください。

## 作業後に必ずやること

- 進捗を `docs/current-work-status.md` に追記してください。
- Claude Design 出力をレビューした場合は、レビュー結果を新しい `docs/zmk-studio-like-app-*.md` に残してください。
- 実装した場合は、ローカル dev server を起動し、ブラウザで画面を確認してください。
- `docs/claude-design-roba-app/` をコミット対象にするか、資料として残すだけにするかを最後に整理してください。
```
