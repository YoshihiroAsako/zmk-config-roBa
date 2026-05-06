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

### 2026-05-06: Keycode Picker 実装・ブラウザ確認・コミット済み

実装・確認済み:

- **`src/keymap/keycodeCatalog.js`**: 8 カテゴリ約 90 エントリの curated list + `searchCatalog(query, category)`。
- **`src/keymap/keycodeCatalog.test.js`**: 26 tests / 2 suites（`node:test` 形式）。
- **`App.jsx`**: `pickerOpen` state、`Pick keycode` ボタン（captureMode を OFF にして開く）、`KeycodePicker` モーダルコンポーネント。選択後は `&kp CODE` を draft に set し Preview タブへ遷移。
- **`styles.css`**: picker 用スタイル追加。
- **テスト**: 121 tests / 17 suites 全パス。ブラウザ確認済み。コミット・push 済み。

### 過去の主な実装済み機能（概要）

- Read-only MVP（43キー表示、7レイヤー、各種タブ）
- Phase 2 source-range editing（replaceBinding / replaceBindings）
- Preview UI（Context Diff / `.keymap Preview`）
- Pending changes + Save all（`POST /__roba/save-bindings`）
- Combo / Macro / Layer rename 編集 + Save all 統合
- keymap-drawer 自動更新（probe-first pattern）
- Key Capture MVP（`captureKeyToBinding`、keydown useEffect、Capture トグル UI）
- Keycode Picker（`keycodeCatalog.js`、検索・カテゴリ絞り込み、`KeycodePicker` モーダル）

### 2026-05-06: Layer rename + keymap-drawer 自動更新 完了・実生成確認済み

実装・確認済み機能:

- **Layer rename**: commit `b3c426d` に含まれる（詳細は git ログ参照）。

- **keymap-drawer 自動更新（実生成確認済み）**:
  - `POST /__roba/update-keymap-drawer` が `ok: true` を返すことを実機確認。
  - `vite.config.js` に以下の修正を追加（commit `c5f2007`）:
    - `dtsiPath` = `boards/shields/roBa/roBa.dtsi` を定義。
    - `keymap draw` に `-d dtsiPath` を追加（roBa はカスタム KBD のため ZMK DB にない）。
    - `PYTHONUTF8: "1"` を env に渡す（日本語 Windows の cp932 問題を回避）。
  - `keymap-drawer/roBa.yaml` と `roBa.svg` が keymap-drawer 0.23.0 フォーマットで再生成済み（commit `c5f2007`）。
  - Python 3.13.13 / keymap-drawer 0.23.0 を winget / pip でインストール済み。

- **テスト状況**: `npm test` 64 tests / 6 suites 成功（layout 修正は純粋な JSX/CSS 変更のため影響なし）。

### 過去の主な実装済み機能（概要）

- Read-only MVP（43キー表示、7レイヤー、bindings/combos/macros/behaviors/sensors/markdown/diagnostics タブ）
- Phase 2 source-range editing 土台（`replaceBinding` / `replaceBindings`）
- Preview UI（Context Diff / `.keymap Preview`）
- 1 binding 保存 + dev-only endpoint（`POST /__roba/save-binding`）
- Pending changes + Save all（`POST /__roba/save-bindings`）
- Combo 編集（binding / positions / layers / timeout-ms）と Save all 統合
- Macro 編集（binding / wait-ms / tap-ms）と Save all 統合
- Layer rename と Save all 統合
- keymap-drawer 自動更新（probe-first pattern、CLI 未配置時の graceful fallback）

## 次にやること

Post-Phase 2-B（Keycode Picker）は完了。以下の順序で進める:

### Step 1: Capture 未対応キーへの誘導（小規模・最優先）

- unsupported キーを Capture した時に captureStatus で「Pick keycode で選択可」のヒントを追加する。
- 変更量が少なく、既存の Key Capture UX をすぐ改善できる。

### Step 2: Combo / Macro への picker 展開（中規模）

- 既存の `KeycodePicker` コンポーネントを Combo 編集・Macro 編集からも呼び出せるようにする。
- 新規 UI 設計は不要。既存 picker をそのまま再利用するだけ。
- Step 1 完了後に着手。

### Step 3: `&lt` / `&mt` 構造化 picker（大規模・Phase 3）

- hold-tap ビヘイビアを複数パラメータで GUI 設定できる専用 picker を新設する。
  - ビヘイビア選択（`&kp` / `&lt` / `&mt` など）→ パラメータ入力（レイヤー番号 or モディファイア ＋ キーコード）
- Step 2 完了後に設計・着手（Combo/Macro での利用ニーズも踏まえて設計する）。

## 現在の注意点

- `LayerRenameRow` は right detail pane の上部に配置する（visual pane / SVG 周辺への配置は SVG overflow 問題が発生するため避ける）。
- `&lt N` / `&mo N` 等の参照は index ベースなので、layer rename しても既存 keymap の動作には影響しない。
- `config/roBa.keymap` と `config/roBa.json` が正本。
- `config/west.yml` の revision は変更しない。
- `build.yaml` の `roBa_R` `snippet: studio-rpc-usb-uart` は維持する。
- `roBa_R.conf` の `CONFIG_ZMK_STUDIO=y` / `CONFIG_ZMK_STUDIO_LOCKING=n` は維持する。
- `CONFIG_EC11` と `CONFIG_ZMK_POINTING` が左右両方の `.conf` にあることだけを理由に削除しない。
- 既存の numbered layer（特に `layer_6`）は勝手にリネームしない。
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
- `docs/zmk-studio-like-app-phase2-source-range-editing.md`
- `docs/zmk-studio-like-app-phase2-save-design.md`
- `docs/zmk-studio-like-app-key-capture-plan.md`
- `docs/zmk-studio-like-app-keymap-editor-trial.md`
- `docs/zmk-studio-like-app-claude-design-request.md`
- `docs/zmk-studio-like-app-claude-design-review.md`

## 更新ルール

作業を進めたら、このファイルの「最新チェックポイント」「次にやること」を更新する。
古い詳細はここに溜めず、必要なら個別の `docs/zmk-studio-like-app-*.md` に移す。
