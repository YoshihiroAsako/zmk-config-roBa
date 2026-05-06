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
- Task B（エンコーダー回転 sensor-bindings 編集）まで実装済み。181 tests / 26 suites 全パス。`npm run build` 成功。
- **次**: ブラウザ手動確認 → commit/push。

## 最新チェックポイント

### 2026-05-07: Task B 実装完了・手動ブラウザ確認待ち（エンコーダー sensor-bindings 編集）

実装済み:

- **`parseSensorBindings()` 追加**: `parseKeymap.js` に `parseSensorBindings()` 追加。`sensorBindings` を `string[]` から `{ raw, sourceRange, behavior, incKey, decKey }[]` 構造体配列に変更。`&inc_dec_kp` 以外の behavior は `incKey/decKey = null`。
- **`markdown.js` 更新**: `binding.raw` を使うよう修正（string → 構造体変更に対応）。
- **`buildSensorBindingDraftChange()` 追加**: `pendingChanges.js` に `sensor-binding` kind の builder を追加。
- **`validateSensorBindingValue()` 追加**: `pendingChanges.js` に `^&inc_dec_kp \S+ \S+$` 形式チェックを追加。`validatePendingChange` に `sensor-binding` 分岐を追加。
- **`validateSensorBindingPreserved()` 追加**: `saveBindingChange.js` に sensor-binding の validateSourceChange 分岐と preserved 検証を追加。
- **`KeycodePicker` 拡張**: `restrictTo` プロップを追加。`sensor-inc/dec` 用途では `["&kp"]` を渡して LT/MT/MKP を非表示。
- **`App.jsx` Sensors タブ UI**: split panel 形式へ再構成。左ペインに sensor-bindings を持つ layer 一覧（Inc/Dec 表示）。右ペインに `SensorDetailPanel`（Pick ボタン・Swap ボタン・Preview・Add/Remove draft）。
- **`sensorDrafts` state / handlers**: `addSensorDraft` / `removeSensorDraft` 追加。reload/save/restore 時に `setSensorDrafts({})` でリセット。
- **テスト追加**: `parseKeymap.test.js` に 3 ケース、`pendingChanges.test.js` に 5 ケース、`saveBindingChange.test.js` に 4 ケース追加。181 tests / 26 suites 全パス。`npm run build` 成功。
- **commit/push**: 未実施（ブラウザ確認待ち）。

### 2026-05-07: Task B 計画確定（エンコーダー sensor-bindings 編集）

詳細計画は `docs/sensor-bindings-implementation-plan.md` に記載済み。

### 2026-05-07: Task A 実装・検証・push 済み（MKP マウスボタン Picker）

実装済み:

- **`STRUCTURED_BEHAVIORS` 拡張**: `"&mkp"` を追加（KP / LT / MT と同列）。
- **`MOUSE_BUTTONS` 定数追加**: MB1〜MB5（Left / Right / Middle / Back / Forward）。
- **`parseStructuredBinding` 拡張**: `&mkp MB1` 等を `{ behavior: "&mkp", mouseButton: "MB1", ... }` に変換。未知の button code は `"MB1"` にフォールバック。
- **`buildStructuredBinding` 拡張**: `behavior === "&mkp"` のとき `validateToken` をスキップし `&mkp ${mouseButton}` を返す。無効 button code はエラー。
- **`bindingDisplay.js` 更新**: MB4 → "Back"、MB5 → "Fwd" ラベル追加。`editability` を `"studio-direct"` に変更。
- **`KeycodePicker` UI 更新**: `MKP` ボタン追加。`&mkp` 選択時は Mouse button セレクト（MB1〜MB5）を表示し、Tap keycode 入力・modifier toggle・検索カタログを非表示。
- **テスト追加**: build / parse / round-trip / fallback / invalid mouse button。168 tests / 24 suites 全パス。`npm run build` 成功。
- **commit/push**: `f6af2ae MKPマウスボタンPickerを実装_20260507` として `main` に push 済み。
- **ブラウザ確認**: ユーザー確認済み。

### 2026-05-07: Task C 実装・検証・push 済み（LT/MT の tap keycode に KP modifier 引き継ぎ）

実装済み:

- **`parseStructuredBinding` 拡張**: `&lt` / `&mt` の tap keycode を `parseKeypressValue` に通し、`keypressModifiers` を返すようにした。
- **`buildStructuredBinding` 拡張**: `&lt` / `&mt` の tap keycode も `buildKeypressValue(keycode, keypressModifiers)` で modifier wrap するようにした。
- **App.jsx の modifier toggle 表示**: `&kp` 限定の条件を外し、`&lt` / `&mt` でも modifier toggle（L Ctrl / L Shift など）を常時表示するようにした。
- **テスト追加**: `structuredBinding.test.js` に modifier 付き build、parse、round-trip テストを追加。既存の `&lt` / `&mt` parse 期待値に `keypressModifiers: []` を追記。
- **検証**: 164 tests / 24 suites 全パス。`npm run build` 成功。dev server HTTP 200 確認。ユーザーブラウザ確認済み。
- **commit/push**: `main` に push 済み。

### 2026-05-07: 次回実装 3 件の現状確認・計画化

ユーザー確認済み（2026-05-07）:

- A. Pick に `MKP` behavior を追加し MB1〜MB5 を選べるようにする。
- B. エンコーダー回転（`sensor-bindings`）の挙動を編集可能にする。
- C. LT/MT の tap keycode に KP modifier 引き継ぎ → **実装完了**。

### 2026-05-07: Trackball layer settings 実装・検証・push 済み

実装済み:

- **`parseTrackballSettings()` 追加**: `parseKeymap.js` に `maskComments()` と `parseTrackballSettings()` を追加。comment-aware scanner（`/* */` / `//` をスペースで mask して offset を維持）で `automouse-layer` / `scroll-layers` を抽出。`parseKeymap()` の戻り値に `trackballSettings` を追加。
- **pending change 対応**: `pendingChanges.js` に `buildTrackballAutomouseDraftChange()` / `buildTrackballScrollLayersDraftChange()` builder を追加。`scroll-layers` は昇順正規化。`validatePendingChange()` に `trackball-automouse-layer` / `trackball-scroll-layers` の validation（範囲チェック・重複チェック）を追加。`upsertDraftChange` の既存 NoOp 判定で `currentRaw === nextRaw` はスキップ。
- **server 側 validation 対応**: `saveBindingChange.js` に 2 kind の `validateSourceChange()` 分岐を追加。保存後に `trackballSettings` と対象 property が残存することを `validateTrackballSettingsPreserved()` で確認。
- **Settings タブ UI 追加**: `App.jsx` に `Settings` タブを追加。`trackballDraft` state を追加し、source リロード / save / restore 後に初期化。`TrackballSettingsPanel` コンポーネントを追加。`automouse-layer` は select（`0` は disabled 表示）、`scroll-layers` は checkbox list で選択。コンテンツ全体を `trackballSettingsScroll` でラップし、`.tableSection` の `1fr` 行で正しく表示されるようにした。
- **CSS 追加**: `styles.css` に `label.scrollLayerCheckbox`（flex レイアウト、`display:grid` 上書き用に詳細度 0,1,1）、`.trackballSettingsScroll`、`.fieldLabel`、`.trackballDisabledHint`、`.comboPreviewBox select`、`.scrollLayerCheckboxList` を追加。
- **Preview panel Context Diff 修正**: `.diffGrid > div` の最終行を `minmax(0,1fr)` → `minmax(100px,1fr)` に変更し、Context Diff が常に最低 100px 確保されるようにした。Pending Changes 行も `minmax(42px,auto)` → `minmax(80px,auto)` に拡大。
- **テスト追加**: `parseKeymap.test.js` に 7 ケース、`pendingChanges.test.js` に 8 ケース、`saveBindingChange.test.js` に 4 ケース追加。全 163 tests / 24 suites パス。
- **手動ブラウザ確認**: Settings タブの初期値・変更・diff・Save all・Reload・Undo を確認済み。Context Diff の視認性も改善確認済み。
- **commit/push**: `main` に push 済み。

### 2026-05-06: Trackball layer settings 計画プロンプト追加

実施内容:

- `docs/trackball-layer-settings-planning-prompt.md` を追加。
- `automouse-layer` / `scroll-layers` を Viewer から編集可能にする機能の計画を、AI に依頼するためのコピペ用指示スクリプトを整備。
- 現状整理、方針、データモデル、UI、保存ロジック、バリデーション、テスト、段階実装、リスク、チェックリストまで一式で出力させるテンプレートにした。

### 2026-05-06: Trackball layer settings 実装計画レビュー資料追加

実施内容:

- `docs/trackball-layer-settings-implementation-plan.md` を追加。
- `automouse-layer` / `scroll-layers` 編集機能について、他 AI / レビュアーに見せるための現状整理・実装方針・データモデル・UI・保存ロジック・バリデーション・テスト・段階実装・リスク・レビュー観点を文書化。
- まだ実装はしていない。次はこの計画のレビュー結果を反映してから着手する。

### 2026-05-06: Trackball layer settings レビュー結果反映

実施内容:

- `docs/trackball-layer-settings-implementation-plan.md` に Claude Code レビューと Codex 再レビューの採用方針を反映。
- MVP 方針として、comment-aware property scan、`automouse-layer = <0>` の disabled 表示、`scroll-layers` の昇順保存、保存後の `trackballSettings` 残存チェックを追加。
- `keymap-drawer` 再生成 skip は MVP 必須ではなく、実装直前に既存挙動維持と比較して決める扱いにした。
- まだ実装はしていない。次は計画に沿って実装するか、追加レビューを行う。

### 2026-05-06: Key Press 修飾キー選択 UI 実装・検証・push 済み

実装済み:

- **`&kp` 用 modifier toggle 追加**: `KeycodePicker` の `KP` 選択時に `L Ctrl` / `L Shift` / `L Alt` / `L GUI` / `R Ctrl` / `R Shift` / `R Alt` / `R GUI` の複数選択 toggle を表示するようにした。
- **Behavior 表示変更**: 構造化 picker の Behavior ボタン表示を `&kp` / `&lt` / `&mt` から `KP` / `LT` / `MT` に変更し、`title` / `aria-label` に正式名称を入れた。
- **parse / build 拡張**: `structuredBinding.js` が `&kp LS(PSCRN)` や `&kp LC(LS(PSCRN))` を base keycode + modifier 群へ分解し、安定順（`LC` → `LS` → `LA` → `LG` → `RC` → `RS` → `RA` → `RG`）で nested modifier syntax を生成するようにした。
- **表示補強**: `bindingDisplay.js` で nested Key Press modifier を `C+S+PSCRN` や `RC+RS+TAB` のように読める表示へ補強した。既存の Windows JIS 補正（例: `LS(INT_YEN)` → `|`）は維持。
- **テスト追加**: `structuredBinding.test.js` に modifier 付き `&kp` の build / parse / round-trip、`parseKeymap.test.js` に modifier 付き表示テストを追加。
- **検証**: `tools/roba-keymap-viewer/` で `npm test` は 144 tests / 21 suites 全パス。`npm run build` 成功。dev server は `http://127.0.0.1:5184/` で HTTP 200 確認済み。ユーザーによる実機確認も完了。

### 2026-05-06: Key Press 修飾キー選択 UI の開発計画を追加（実装済み）

計画済み:

- **目的**: 添付画像の ZMK Studio に近い操作で、`&kp LS(PSCRN)` や `&kp LC(LS(TAB))` のような Shift / Ctrl / Alt / GUI 付き Key Press を raw binding 手入力なしで作れるようにする。
- **Behavior ボタン表示変更**: 現在の `&kp` / `&lt` / `&mt` 表示を、`KP`（Key Press）/ `LT`（Layer-Tap）/ `MT`（Mod-Tap）へ変更する。
- **`&kp` 用 modifier toggle**: `L Ctrl` / `L Shift` / `L Alt` / `L GUI` / `R Ctrl` / `R Shift` / `R Alt` / `R GUI` を複数選択できる UI を追加する。
- **parse / build 対応**: 既存の `&kp LS(INT_YEN)` や `&kp LC(LS(PSCRN))` を開いた時に、Key と modifier toggle 状態へ復元できるようにする。
- **既存機能維持**: `&lt` の Hold layer、`&mt` の Hold modifier + Tap keycode は現在の構造化 picker の挙動を維持する。
- **詳細計画**: `docs/zmk-studio-like-app-advanced-editing-ux-notes.md` の「Key Press 修飾キー選択 UX（次回実装計画）」を参照。
- **想定編集ファイル**: `tools/roba-keymap-viewer/src/keymap/structuredBinding.js`、`tools/roba-keymap-viewer/src/keymap/structuredBinding.test.js`、`tools/roba-keymap-viewer/src/App.jsx`、必要に応じて `tools/roba-keymap-viewer/src/keymap/bindingDisplay.js` と関連テスト。
- **検証**: 後続実装で `npm test`、`npm run build`、dev server HTTP 200 まで確認済み。実ブラウザ自動確認は `agent-browser` CLI 不在のため未実施。
- **後回し**: PC の物理キー入力から modifier 付き binding を直接 capture する機能は、ブラウザショートカット衝突があるため別タスクにする。

### 2026-05-06: バックアップ復元 UI 実装・検証・push 済み

実装済み:

- **バックアップ一覧 API 追加**: `GET /__roba/keymap-backups` で `config/.roBa.keymap.bak/*.roBa.keymap` の最近 10 件を返す。
- **バックアップ復元 API 追加**: `POST /__roba/restore-keymap-backup` で指定バックアップを `config/roBa.keymap` へ復元する。復元前の現在ファイルも新しいバックアップとして退避する。
- **Preview タブに Backups UI 追加**: バックアップ一覧、Refresh、Restore ボタンを表示。Restore 前に確認ダイアログを出し、pending changes がある場合は破棄されることも明示する。
- **復元後処理**: keymap source / mtime を更新し、pending changes / undo / redo / 新規 combo・macro draft 状態をクリア。復元後に keymap-drawer 自動更新も呼ぶ。
- **ドキュメント更新**: `docs/viewer-to-device-guide.md` の復元手順を手動 PowerShell から UI 復元へ更新。
- **検証**: `npm test` は 142 tests / 21 suites 全パス。`npm run build` 成功。dev server は `http://127.0.0.1:5183/` で HTTP 200、`/__roba/keymap-backups` 応答確認済み。`agent-browser` CLI は PATH に無かったため実ブラウザ自動確認は未実施。
- **commit/push**: `d95b794 バックアップ復元UIを実装_20260506` として `main` にコミット済み。`main` と `origin/main` は一致済み。

### 2026-05-06: Viewer 簡単起動・停止スクリプト実装・検証・push 済み

実装済み:

- リポジトリ直下に `start-roba-viewer.cmd` / `stop-roba-viewer.cmd` を追加。
- `start-roba-viewer.cmd` は `tools/roba-keymap-viewer/start-viewer.ps1` を呼び、`npm run dev -- --host 127.0.0.1 --port 5183` を裏で起動し、ブラウザで `http://127.0.0.1:5183/` を開く。
- `stop-roba-viewer.cmd` は `tools/roba-keymap-viewer/stop-viewer.ps1` を呼び、pid ファイルから npm/cmd/node のプロセスツリーを停止する。
- `.roba-viewer.pid` / `.roba-viewer.*.log` は `tools/roba-keymap-viewer/.roba-viewer.*` として `.gitignore` 済み。
- `docs/viewer-to-device-guide.md` と `README.md` にダブルクリック起動・終了手順を追記。
- **検証**: `start-roba-viewer.cmd` で起動し、`http://127.0.0.1:5183/` が HTTP 200。`stop-roba-viewer.cmd` で停止し、その後 HTTP 応答が停止することを確認済み。

### 2026-05-06: Undo/Redo + キーボードショートカット実装・検証・push 済み

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
- **commit/push**: `00a3cdf Undo/Redo と Ctrl+S キーボードショートカットを実装_20260506` として `main` にコミット済み。`main` と `origin/main` は一致済み。

### 2026-05-06: Save 前バリデーション実装・検証・push 済み

実装済み:

- **`validateBindingLayerRef()` 追加**: `&lt N` / `&mo N` / `&to N` の N が `layerCount` 範囲外の場合にエラーを投げる helper。
- **`binding` / `combo-binding` / `macro-binding` の layer range チェック**: `validatePendingChange()` に各 kind ごとのチェックを追加。
- **`macro-bindings-replace` の layer range チェック**: nextRaw の editable binding をすべて検査。
- **`buildPendingChangesState` に `context` 引数追加**: `{ keyCount }` を受け取り、`layerCount`（= `layers.length`）と `keyCount`（デフォルト 43）を `validatePendingChange` に渡す。ハードコードされていた値を実際の値で置き換え。
- **App.jsx の呼び出し更新**: `{ keyCount: document.physicalLayout.length }` を渡すよう修正。
- **テスト追加**: 4 ケース追加（`&lt N` out-of-range、`&mo N` out-of-range、最大有効インデックスで有効、combo-binding out-of-range）。
- **検証**: `npm test` は 139 tests / 20 suites 全パス。`npm run build` 成功。実ブラウザ確認: 未実施。
- **commit/push**: `da8918b save前バリデーションを実装_20260506` として `main` にコミット済み。`main` と `origin/main` は一致済み。

### 2026-05-06: 外部変更検知付き Save all 実装・検証・push 済み

実装済み:

- **`GET /__roba/keymap-source` に `mtime` 追加**: `stat()` で `mtimeMs` を取得し、`{ ok, source, mtime }` を返す。
- **`POST /__roba/save-bindings` に mtime チェック追加**: `expectedMtime`, `forceMtime`, `forceDrawer` を受け付ける。外部変更があれば `{ ok: false, error: "FILE_CHANGED" }` を返す。
- **`checkDrawerDirty()` ヘルパー追加**: `git status --porcelain` で `keymap-drawer/` の未コミット差分を検出し、`{ ok: false, error: "DRAWER_DIRTY", paths }` を返す。
- **クライアント側 `keymapMtime` state 追加**: マウント時に初期 mtime を fetch。reload 時・save 成功時にも更新。
- **`saveAllPendingChanges` に force フラグ対応**: `FILE_CHANGED` / `DRAWER_DIRTY` 時は `window.confirm` で確認し、確認後に force フラグを立てて再呼び出し。
- **検証**: `npm test` は 135 tests / 20 suites 全パス。`npm run build` 成功。実ブラウザ確認: 未実施。
- **commit/push**: `805ecbc save all の外部変更検知機能を実装_20260506` として `main` にコミット済み。`main` と `origin/main` は一致済み。

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

### ~~Trackball layer settings の手動ブラウザ確認（完了・push 済み）~~

### 新規実装タスク（2026-05-07 計画・未着手）

ユーザー確認済み（2026-05-07）。次回チャットではここから着手する。

#### ~~A. マウスボタン Pick（`&mkp` 対応）~~（完了）

- 168 tests / 24 suites 全パス。push 済み。ブラウザ確認は手動で実施すること。

#### ~~B. エンコーダー回転（`sensor-bindings`）編集~~（実装済み・ブラウザ確認待ち）

- 181 tests / 26 suites 全パス。`npm run build` 成功。手動ブラウザ確認後に commit/push。

#### D. Consumer code カタログ拡張（候補）

- **目的**: Sensors タブや Bindings タブで音量（`C_VOL_UP` / `C_VOL_DN`）・メディア（`C_NEXT` / `C_PREV`）・明るさ（`C_BRI_INC` / `C_BRI_DEC`）等を Picker から選べるようにする。
- **対象ファイル**: `tools/roba-keymap-viewer/src/keymap/keycodeCatalog.js`（および関連表示・テスト）。
- **状況**: Task B では既存カタログにある keycode のみ扱う。Consumer code が必要になった時点で別タスクとして着手する。

#### ~~C. LT/MT の tap keycode に KP modifier 引き継ぎ（完了）~~

- `structuredBinding.js` / `App.jsx` を更新。164 tests / 24 suites 全パス。push 済み。

#### E. sensor-bindings のレイヤー追加・削除 UI（ユーザー要望・未着手）

- **目的**: Sensors タブから、任意のレイヤーに `sensor-bindings = <&inc_dec_kp X Y>;` を追加したり、既存の sensor-bindings を削除できるようにする。
- **設計方針（草案）**:
  - **追加**: 左ペインの下部に "Add layer" ボタンを設け、sensor-bindings を持たないレイヤーをドロップダウンで選択 → 初期値 `&inc_dec_kp PG_UP PAGE_DOWN` で draft を作成。
  - **削除**: 右ペインの `SensorDetailPanel` に "Remove sensor-binding" ボタンを追加。対象レイヤーの `sensor-bindings = <...>;` 行全体を削除する pending change を生成。
  - **実装種別**: 追加は `sensor-binding-insert` kind、削除は `sensor-binding-remove` kind として `pendingChanges.js` / `saveBindingChange.js` に追加。
  - **スコープ**: `&inc_dec_kp X Y` 形式のみ。追加時は keymap の対象レイヤーブロック内に `sensor-bindings` プロパティが存在しないことを確認してから挿入する。
- **詳細計画**: 着手時に設計詳細を詰める。

#### F. `&inc_dec_cp` behavior 対応（候補・D の後）

- **目的**: Consumer-press（音量・メディア等）専用の `&inc_dec_cp` behavior を Sensors タブで選択・編集できるようにする。
- **前提**: Task D（Consumer code カタログ拡張）が完了していることが望ましい。

#### G. マウスホイール（`&msc`）sensor-binding 対応（低優先）

- **目的**: `sensor-bindings = <&msc SCRL_UP>` 等を Sensors タブで編集できるようにする。

#### H. ハードウェアレベル方向反転（スコープ外）

- `.overlay` / `.dtsi` 編集が必要でファームウェア再ビルドが必要なため、Viewer から操作する対象外。Sensors タブ UI の注記のみで対応済み。

#### 実装順の推奨

1. ~~**C**（完了）~~
2. ~~**A**（完了）~~
3. ~~**B**（完了・ブラウザ確認待ち）~~
4. **E**（sensor-bindings のレイヤー追加・削除 UI）— ユーザー要望
5. **D**（Consumer code カタログ拡張）— E と前後しても可
6. **F**（`&inc_dec_cp` 対応）— D の後
7. **G**（`&msc` 対応）— 低優先

各タスク完了ごとに `npm test` / `npm run build` / 手動ブラウザ確認 → commit / push → `docs/current-work-status.md` 更新の順で進める。

### 次の候補（任意・未着手）

1. **Key Press 修飾キー選択 UI の追加動作確認（任意）**
   - `Pick` から `KP` を選び、modifier toggle と keycode 検索で `&kp LS(PSCRN)` や `&kp LC(LS(TAB))` が作れることを確認する。
   - 主要操作は実装時に確認済み。追加で気になる操作があれば実施する。

2. ~~**外部変更検知付き Save all（安全性強化）** — 実装済み・push 済み~~
3. ~~**Save 前バリデーション（推し）** — 実装済み・push 済み~~
4. ~~**Undo / Redo（pending changes ベース）** — 実装済み・push 済み~~
   - `undoStack` / `redoStack` + `commitPendingChanges` で pending 履歴管理。Ctrl+Z / Ctrl+Shift+Z ショートカット付き。
5. ~~**キーボードショートカット** — 実装済み（Undo/Redo と同時）・push 済み~~
   - `Ctrl+S` = Save all、`Ctrl+Z` = Undo、`Ctrl+Shift+Z` / `Ctrl+Y` = Redo。
6. ~~**バックアップ復元 UI** — 実装済み・push 済み~~
   - `Save all` 直前バックアップの最近 N 件を UI に列挙し、1 クリックで `config/roBa.keymap` を戻せるようにする。`docs/viewer-to-device-guide.md` 8 章の手動 PowerShell リカバリを UI で完結させる。

その他、必要に応じて:

- New combo / New macro の保存フローを追加で手動ブラウザ確認する。
- Macro binding 行追加/削除の UX を微調整する（例: 行の並べ替え、undo 表示）。
- `docs/trackball-layer-settings-implementation-plan.md` に沿って、trackball layer settings 編集機能を実装する。

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
- `docs/sensor-bindings-implementation-plan.md`
- `docs/trackball-layer-settings-planning-prompt.md`
- `docs/trackball-layer-settings-implementation-plan.md`
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
