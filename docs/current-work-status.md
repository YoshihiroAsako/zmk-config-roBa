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

### 2026-05-06: Step 4 構造化 picker MVP 実装・検証済み

実装済み（Step 4 MVP 相当）:

- **`&kp` / `&lt` / `&mt` 構造化 picker**: 既存 `KeycodePicker` を "Pick binding" に拡張し、ビヘイビア選択、`&lt` の hold layer、`&mt` の hold modifier、tap keycode 入力、生成 binding preview を追加。
- **Bindings / Combo / Macro で共通利用**: `pickerContext` の対象に応じて現在 draft を初期値にし、選択結果を raw binding / combo binding / macro binding draft に反映する。
- **テスト helper 追加**: `keymap/structuredBinding.js` と `structuredBinding.test.js` を追加。`&kp` / `&lt` / `&mt` の build / parse / validation をテスト。
- **検証**: `npm test` は 124 tests / 18 suites 全パス。`npm run build` 成功。Vite dev server は `http://localhost:5173` で HTTP 200 確認済み。`agent-browser` CLI は PATH に無かったが、ユーザー側ブラウザで一通り操作確認済み・問題なし。
- **コミット/プッシュ**: ユーザー報告ではコミット・プッシュ済み。ただしこの作業ツリーでは 2026-05-06 時点で Step 4 関連ファイルが未コミット差分として見えているため、新ブランチ作成前に `git status` と直近コミット内容を確認すること。

### 2026-05-06: Step 3 完了・コミット済み

実装済み（Step 3 相当）:

- **SVG クリックによる Combo ポジション入力**: Combos タブ + combo 選択中に SVG のキーをクリックすると `comboDraft.positionsRaw` をトグル追加/削除する。Bindings タブでは従来通り binding 選択として動作。
- **ハイライトを draft 連動に変更**: `comboHighlightPositions` を `selectedCombo.positions`（保存済み）から `comboDraft.positionsRaw`（パース済み）ベースに変更。
- **comboSavedOnly スタイル**: 保存済みだが draft から外れたポジションに amber 破線ボーダーを適用（`.keyCap.comboSavedOnly`）。
- **Remove draft 系ボタンの修正**: Bindings / Combo / Macro / Layer rename の 4 箇所で、pending 未追加でも draft 変更済みなら Remove ボタンをアクティブにするよう条件を修正。
- **テスト**: 121 tests / 17 suites 全パス。ブラウザ確認済み・コミット済み。

### 過去の主な実装済み機能（概要）

- Read-only MVP（43キー表示、7レイヤー、各種タブ）
- Phase 2 source-range editing（replaceBinding / replaceBindings）
- Preview UI（Context Diff / `.keymap Preview`）
- Pending changes + Save all（`POST /__roba/save-bindings`）
- Combo / Macro / Layer rename 編集 + Save all 統合
- keymap-drawer 自動更新（probe-first pattern）
- Key Capture MVP（`captureKeyToBinding`、keydown useEffect、Capture トグル UI）
- Keycode Picker（`keycodeCatalog.js` 9カテゴリ・約111エントリ、検索・カテゴリ絞り込み、`KeycodePicker` モーダル）
- Step 1: Capture 未対応キーへの誘導ヒント、Shifted Symbols カタログ追加

## 次にやること

### ~~Step 1: Capture 未対応キーへの誘導（完了）~~

### ~~Step 2: Combo / Macro への picker 展開（完了）~~

### ~~Step 3: SVG クリックによる Combo ポジション入力（完了）~~

### ~~Step 4: `&lt` / `&mt` 構造化 picker（MVP 実装・検証完了）~~

- hold-tap ビヘイビアを複数パラメータで GUI 設定できる専用 picker を新設する。
  - ビヘイビア選択（`&kp` / `&lt` / `&mt` など）→ パラメータ入力（レイヤー番号 or モディファイア ＋ キーコード）
- Combo / Macro での利用ニーズも踏まえて設計する。

### Phase 5: 新規コンボ・マクロ追加（大規模・次の設計タスク）

- Combos タブに "New combo" ボタンを設け、`.keymap` の `combos { }` ブロックに新しいノードを挿入する。
- Macros タブに "New macro" ボタンを設け、`macros { }` ブロックに新しいノードを挿入する。
- 既存マクロへの binding 行の追加/削除も含む。
- 既存の「ソース範囲を上書きする」ロジックとは異なり、新しいテキストブロックをゼロから挿入する設計が必要なため、Step 4 完了後に別途設計する。
- 最初の次アクション:
  - まず新規 combo / macro 追加の保存設計を小さく切る。推奨は combo 追加から始め、ノード名・binding・positions・layers・timeout-ms の draft UI と、`combos { }` ブロック末尾への安全な node insertion helper を作る。

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
