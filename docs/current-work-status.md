# Current Work Status

このファイルは、新しいチャットで作業をすぐ再開するための最小メモです。
詳細な設計史やレビュー結果は関連ドキュメントに置き、このファイルには「今どこまで進んだか」と「次に何をするか」だけを残します。

## 使い方

新しいチャットでは、まず次の2ファイルだけを `@` 参照すれば再開できます。

- `@AGENTS.md`
- `@docs/current-work-status.md`

過去の計画書やレビュー文書は必要になった時だけ読むこと。最初から全部読ませない。

## 再開用メッセージ

新しいチャットで具体的な依頼文が必要な場合は、次の短い文で足ります。

```md
このリポジトリ `zmk-config-roBa` で、現在の作業を続けてください。回答は日本語でお願いします。

まず `@AGENTS.md` と `@docs/current-work-status.md` を読んで、現在の進捗・制約・次アクションを把握してください。
必要になった時だけ、`docs/current-work-status.md` の「関連ファイル」にある詳細資料を追加で読んでください。

ユーザーの最新指示が `docs/current-work-status.md` と矛盾する場合は、ユーザーの最新指示を優先してください。
```

## 現在の作業テーマ

roBa 用 ZMK Studio 風ローカル補助アプリ、`tools/roba-keymap-viewer/` の read-only MVP。

目的:

- `config/roBa.keymap` を正本として読み取る。
- `config/roBa.json` を物理レイアウトの主な参照元として使う。
- ZMK Studio の完全代替ではなく、公式 ZMK Studio と併用するローカル補助アプリとして扱う。
- 初期段階は read-only。`.keymap` 直接編集や保存は Phase 2 以降。

## 最新チェックポイント

2026-05-04:

- Claude Design 出力を `docs/claude-design-roba-app/` に配置済み。
- Claude Design の `uploads/roBa.json` と `uploads/roBa.keymap` は確認時点で `config/roBa.json` / `config/roBa.keymap` と一致していた。ただし正本は常に `config/` 側。
- Claude Design レビューを `docs/zmk-studio-like-app-claude-design-review.md` に記録済み。
- Vite + React の read-only MVP を `tools/roba-keymap-viewer/` に作成済み。
- MVP は canonical files を直接 import する:
  - `config/roBa.json`
  - `config/roBa.keymap`
  - `boards/shields/roBa/roBa.dtsi`
- 実装済み:
  - 43キーの表示
  - 7レイヤー切り替え
  - key detail panel
  - read-only `.keymap` parser
  - bindings / combos / macros / behaviors / sensors / markdown / diagnostics tabs
  - parsed data からの Markdown preview
  - key count、DTS physical-layout count、layer count などの diagnostics
- Parser smoke tests を `tools/roba-keymap-viewer/src/keymap/parseKeymap.test.js` に追加済み。
- `tools/roba-keymap-viewer/package.json` に `npm test` を追加済み。
- 再開用の独立プロンプトファイルは廃止し、このファイルへ統合済み。

## 検証状況

2026-05-04 時点:

- `tools/roba-keymap-viewer/` で `npm test` 成功。
- `tools/roba-keymap-viewer/` で `npm run build` 成功。
- Dev server を `npm run dev -- --port 5173` で起動し、Microsoft Edge + Playwright による smoke check 成功。
- Smoke check 内容:
  - title rendered
  - body non-empty
  - Vite overlay なし
  - `.keyCap` が43個
  - layer buttons が7個
  - tabs が7個
  - console errors なし
  - diagnostics counts OK
- 検証後、dev server process と child process は停止済み。
- build 検証で生成された `dist/` は削除済み。

## 次にやること

優先順:

1. read-only MVP と parser smoke tests を安定チェックポイントとして commit する。
2. `http://localhost:5173` でユーザーが視覚確認する。
3. 必要なら Windows JIS 表示ラベルを改善する。
4. Phase 2 の source-range editing 設計とテストを追加する。

## 現在の注意点

- `config/roBa.keymap` と `config/roBa.json` が正本。Claude Design の `uploads/` は snapshot 扱い。
- `config/west.yml` の revision は変更しない。
- `build.yaml` の `roBa_R` `snippet: studio-rpc-usb-uart` は維持する。
- `roBa_R.conf` の `CONFIG_ZMK_STUDIO=y` / `CONFIG_ZMK_STUDIO_LOCKING=n` は維持する。
- `CONFIG_EC11` と `CONFIG_ZMK_POINTING` が左右両方の `.conf` にあることだけを理由に削除しない。
- 既存の numbered layer、特に `layer_6` は勝手にリネームしない。
- keymap の見た目が変わる変更では、`keymap-drawer/roBa.yaml` と `keymap-drawer/roBa.svg` も更新する。
- `zephyr/` と `.west/` は編集しない。

## 関連ファイル

roBa Keymap Viewer:

- `tools/roba-keymap-viewer/`
- `config/roBa.keymap`
- `config/roBa.json`
- `boards/shields/roBa/roBa.dtsi`

詳細資料:

- `docs/zmk-studio-like-app-plan.md`
- `docs/zmk-studio-like-app-phase0-research.md`
- `docs/zmk-studio-like-app-phase0-rereview.md`
- `docs/zmk-studio-like-app-advanced-editing-ux-notes.md`
- `docs/zmk-studio-like-app-keymap-editor-trial.md`
- `docs/zmk-studio-like-app-claude-design-request.md`
- `docs/zmk-studio-like-app-claude-design-review.md`

## 更新ルール

作業を進めたら、このファイルの「最新チェックポイント」「検証状況」「次にやること」を更新する。
古い詳細はここに溜めず、必要なら個別の `docs/zmk-studio-like-app-*.md` に移す。
