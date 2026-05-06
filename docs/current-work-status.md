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

roBa 用 ZMK Studio 風ローカル補助アプリ、`tools/roba-keymap-viewer/` のローカル keymap viewer/editor。

目的:

- `config/roBa.keymap` を正本として読み取る。
- `config/roBa.json` を物理レイアウトの主な参照元として使う。
- ZMK Studio の完全代替ではなく、公式 ZMK Studio と併用するローカル補助アプリとして扱う。
- 初期 read-only MVP から、限定的な `.keymap` 編集・保存機能まで実装済み。
- 現在は Phase 5.5 まで完了。主要機能は一通り揃っており、ユーザーは当面の追加実装を急いでいない。
- 次にやる場合は「次にやること > 次の候補（任意・未着手）」から選ぶ。優先度上位は外部変更検知付き Save all と Save 前バリデーション。

## 最新チェックポイント

### 2026-05-06: Undo/Redo + キーボードショートカット実装・検証済み（未 push）

実装済み:

- **`undoStack` / `redoStack` state 追加**: `pendingChanges` 操作履歴を最大 50 件保持。
- **`commitPendingChanges(newChanges)` 追加**: undo 履歴を積んで `setPendingChanges` を呼ぶ共通ヘルパー。ユーザー操作による全 pending 変更関数から呼ぶ。save 完了後の `setPendingChanges([])` は呼ばない（save はアンドゥ対象外）。
- **`undo()` / `redo()`**: stack を pop/push して `pendingChanges` を巻き戻し/やり直す。
- **キーボードショートカット useEffect**: `shortcutsRef` 経由で最新関数を呼ぶパターン（空 deps で一度だけ登録）。
  - `Ctrl+Z` = Undo（input/textarea フォーカス中は除外）
  - `Ctrl+Shift+Z` / `Ctrl+Y` = Redo（同）
  - `Ctrl+S` = Save all（常に有効、保存できない状態なら関数内でハンドル済み）
- **PreviewPanel に Undo/Redo ボタン追加**: "Save all" / "Clear all" と並べて表示。`canUndo` / `canRedo` で無効化制御。tooltip で shortcut 表示。
- **検証**: `npm test` は 139 tests / 20 suites 全パス。`npm run build` 成功。実ブラウザ確認: 未実施。

### 2026-05-06: Save 前バリデーション実装・検証済み（未 push）

実装済み:

- **`validateBindingLayerRef()` 追加**: `&lt N` / `&mo N` / `&to N` の N が `layerCount` 範囲外の場合にエラーを投げる helper。
- **`binding` / `combo-binding` / `macro-binding` の layer range チェック**: `validatePendingChange()` に各 kind ごとのチェックを追加。
- **`macro-bindings-replace` の layer range チェック**: nextRaw の editable binding をすべて検査。
- **`buildPendingChangesState` に `context` 引数追加**: `{ keyCount }` を受け取り、`layerCount`（= `layers.length`）と `keyCount`（デフォルト 43）を `validatePendingChange` に渡す。ハードコードされていた値を実際の値で置き換え。
- **App.jsx の呼び出し更新**: `{ keyCount: document.physicalLayout.length }` を渡すよう修正。
- **テスト追加**: 4 ケース追加（`&lt N` out-of-range、`&mo N` out-of-range、最大有効インデックスで有効、combo-binding out-of-range）。
- **検証**: `npm test` は 139 tests / 20 suites 全パス。`npm run build` 成功。実ブラウザ確認: 未実施。

### 2026-05-06: 外部変更検知付き Save all 実装・検証済み（未 push）

実装済み:

- **`GET /__roba/keymap-source` に `mtime` 追加**: `stat()` で `mtimeMs` を取得し、`{ ok, source, mtime }` を返す。
- **`POST /__roba/save-bindings` に mtime チェック追加**: `expectedMtime`, `forceMtime`, `forceDrawer` を受け付ける。外部変更があれば `{ ok: false, error: "FILE_CHANGED" }` を返す。
- **`checkDrawerDirty()` ヘルパー追加**: `git status --porcelain` で `keymap-drawer/` の未コミット差分を検出し、`{ ok: false, error: "DRAWER_DIRTY", paths }` を返す。
- **クライアント側 `keymapMtime` state 追加**: マウント時に初期 mtime を fetch。reload 時・save 成功時にも更新。
- **`saveAllPendingChanges` に force フラグ対応**: `FILE_CHANGED` / `DRAWER_DIRTY` 時は `window.confirm` で確認し、確認後に force フラグを立てて再呼び出し。
- **検証**: `npm test` は 135 tests / 20 suites 全パス。`npm run build` 成功。実ブラウザ確認: 未実施。

### 2026-05-06: Phase 5.5 実装・検証・push 済み

- **検証**: `tools/roba-keymap-viewer/` で `npm test` は 135 tests / 20 suites 全パス。`npm run build` 成功。
- **dev server**: `http://127.0.0.1:5182/` で HTTP 200 を確認済み。
- **ブラウザ自動確認**: `agent-browser` CLI は PATH に無かったため未実施。
- **Save all 修正・実ブラウザ確認済み**: 既存 macro binding 行追加・削除の `Save all` が `macro-bindings-replace target macro is missing after replacement.` で失敗したため、`App.jsx` の保存 payload に `macroName` を含めるよう修正。`npm test` / `npm run build` は再度成功。ユーザー側ブラウザで再試行し、エラーなしで保存成功を確認済み。
- **Phase 5.5 Capture 拡張・実ブラウザ確認済み**: 確認用に `config/roBa.keymap` へ入った macro binding 追加差分を戻した。Combo / New combo / 既存 Macro binding 行 / New macro の binding draft に `Capture` ボタンを追加し、Capture 入力を該当 draft へ反映するようにした。`npm test` / `npm run build` は成功。ユーザー側ブラウザで確認済み。
- **Phase 5.5 UI 調整・実ブラウザ確認済み**: Combo / Macro の個別 `Capture` ボタンが active 時に `Capture ON` 表示と強調色になるようにした。Macro binding 行で入力欄がボタンに押しつぶされないよう、binding 行を折り返し可能にして入力欄の最小幅を確保した。`npm test` / `npm run build` は成功。ユーザー側ブラウザで問題なし確認済み。
- **commit/push**: `28445f1 phase 5.5 implementation_20260505` として `main` にコミット済み。`main` と `origin/main` は一致していた。
- **現在の未コミット文書差分**: 2026-05-06 時点で、作業メモ整理として `docs/current-work-status.md` が変更済み、`docs/viewer-to-device-guide.md` が新規追加。どちらも文書差分で、追加確認事項や commit/push を止めるべき内容はない。

### 2026-05-06: Phase 5 既存 macro binding 行追加/削除 MVP 実装・検証済み

実装済み（Phase 5 の既存 macro binding 行編集 MVP）:

- **既存 Macro detail に binding 行操作を追加**: Macro detail の binding draft 一覧に "Add binding row" と行ごとの "Remove" を追加。新規行は `&kp A` で作成し、既存の Phase 2 対応 binding と新規行だけ編集・削除できる。
- **非対応 binding の保護**: `&to 0` や `&macro_param_1to1` など Phase 2 で直接編集しない既存 binding は read-only のまま維持し、変更・削除による破壊を避ける。
- **bindings 全体置換 pending change を追加**: binding 行数が変わる場合だけ `macro-bindings-replace` として `bindings = <...>` の中身全体を置換する。単一 binding 値の置換は従来どおり `macro-binding` を使う。
- **Save all 対応**: `saveBindingChanges` が `macro-bindings-replace` を検証し、macro count を維持したまま保存する。未対応 binding は同じ index に残る場合のみ許可する。
- **テスト追加**: `macroPreview.test.js` に既存 macro binding 行の追加/削除 preview、`saveBindingChange.test.js` に既存 macro binding 行追加保存テストを追加。
- **検証**: `npm test` は 135 tests / 20 suites 全パス。`npm run build` 成功。Vite dev server は `http://127.0.0.1:5182/` で HTTP 200 確認済み。`agent-browser` CLI は PATH に無かったためブラウザ自動操作は未実施。

### 2026-05-06: Phase 5 新規 macro 追加 MVP 実装・検証済み

実装済み（Phase 5 の macro 追加 MVP）:

- **Macros タブに New macro 導線を追加**: "New macro" ボタンから右ペインに新規 macro draft UI を表示。node name / bindings / wait-ms / tap-ms / label を入力でき、bindings は既存 picker と連携する。
- **新規 macro node insertion helper 追加**: `macro-node-insert` pending change として、`macros { }` ブロック末尾へ安全にノードを挿入する `keymap/macroInsert.js` を追加。
- **Save all 対応**: `saveBindingChanges` が `macro-node-insert` のときだけ macro count +1 を許可。保存前に挿入後 keymap を再パースして、1 macro だけ増えることを検証する。
- **テスト追加**: `macroInsert.test.js` と `saveBindingChange.test.js` の新規 macro 保存テストを追加。
- **検証**: `npm test` は 132 tests / 20 suites 全パス。`npm run build` 成功。Vite dev server は `http://127.0.0.1:5173/` で HTTP 200 と HTML 応答を確認済み。`agent-browser` CLI は PATH に無かったためブラウザ自動操作は未実施。

### 2026-05-06: Phase 5 新規 combo 追加 MVP 実装・検証済み

実装済み（Phase 5 の combo 追加 MVP）:

- **Combos タブに New combo 導線を追加**: "New combo" ボタンから右ペインに新規 combo draft UI を表示。node name / binding / positions / layers / timeout-ms を入力でき、binding は既存 picker と連携する。
- **SVG クリックで新規 combo positions を入力**: New combo 作成中も、Combos タブで SVG のキークリックにより positions draft をトグル更新する。
- **新規 combo node insertion helper 追加**: `combo-node-insert` pending change として、`combos { }` ブロック末尾へ安全にノードを挿入する `keymap/comboInsert.js` を追加。
- **Save all 対応**: `saveBindingChanges` が `combo-node-insert` のときだけ combo count +1 を許可。保存前に挿入後 keymap を再パースして、1 combo だけ増えることを検証する。
- **テスト追加**: `comboInsert.test.js` と `saveBindingChange.test.js` の新規 combo 保存テストを追加。
- **検証**: `npm test` は 128 tests / 19 suites 全パス。`npm run build` 成功。Vite dev server は `http://localhost:5173` で HTTP 200 と HTML 応答を確認済み。`agent-browser` CLI は PATH に無かったためブラウザ自動操作は未実施。

### 2026-05-06: Step 4 構造化 picker MVP 実装・検証済み

実装済み（Step 4 MVP 相当）:

- **`&kp` / `&lt` / `&mt` 構造化 picker**: 既存 `KeycodePicker` を "Pick binding" に拡張し、ビヘイビア選択、`&lt` の hold layer、`&mt` の hold modifier、tap keycode 入力、生成 binding preview を追加。
- **Bindings / Combo / Macro で共通利用**: `pickerContext` の対象に応じて現在 draft を初期値にし、選択結果を raw binding / combo binding / macro binding draft に反映する。
- **テスト helper 追加**: `keymap/structuredBinding.js` と `structuredBinding.test.js` を追加。`&kp` / `&lt` / `&mt` の build / parse / validation をテスト。
- **検証**: `npm test` は 124 tests / 18 suites 全パス。`npm run build` 成功。Vite dev server は `http://localhost:5173` で HTTP 200 確認済み。`agent-browser` CLI は PATH に無かったが、ユーザー側ブラウザで一通り操作確認済み・問題なし。
- **コミット/プッシュ**: 後続の Phase 5.5 コミットに含まれ、`main` へ push 済み。

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

- `&kp` / `&lt` / `&mt` の構造化 picker は実装済み。今後拡張する場合は、他の behavior を増やすか、Save 前バリデーション側へ寄せて扱う。

### Phase 5: 新規コンボ・マクロ追加（完了）

- ~~Combos タブに "New combo" ボタンを設け、`.keymap` の `combos { }` ブロックに新しいノードを挿入する。~~
- ~~Macros タブに "New macro" ボタンを設け、`macros { }` ブロックに新しいノードを挿入する。~~
- ~~既存マクロへの binding 行の追加/削除も含む。~~

### 次の候補（任意・未着手）

主要機能は一通り実装済み。以下は「使いやすさ」を高めるための候補で、優先度順に並べる。着手する場合は、先に目的と編集範囲をこのファイルへ短く追記してから進める。

1. ~~**外部変更検知付き Save all（安全性強化）** — 実装済み・push 済み~~
2. ~~**Save 前バリデーション（推し）** — 実装済み・push 済み~~
3. ~~**Undo / Redo（pending changes ベース）** — 実装済み・未 push~~
   - `undoStack` / `redoStack` + `commitPendingChanges` で pending 履歴管理。Ctrl+Z / Ctrl+Shift+Z ショートカット付き。
4. ~~**キーボードショートカット** — 実装済み（Undo/Redo と同時）・未 push~~
   - `Ctrl+S` = Save all、`Ctrl+Z` = Undo、`Ctrl+Shift+Z` / `Ctrl+Y` = Redo。
5. **バックアップ復元 UI**
   - `Save all` 直前バックアップの最近 N 件を UI に列挙し、1 クリックで `config/roBa.keymap` を戻せるようにする。`docs/viewer-to-device-guide.md` 8 章の手動 PowerShell リカバリを UI で完結させる。

その他、必要に応じて:

- New combo / New macro の保存フローを追加で手動ブラウザ確認する。
- Macro binding 行追加/削除の UX を微調整する（例: 行の並べ替え、undo 表示）。

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

- `docs/viewer-to-device-guide.md`
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
