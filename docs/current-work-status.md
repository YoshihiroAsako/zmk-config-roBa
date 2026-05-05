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
- read-only MVP は `6df760b Add read-only roBa keymap viewer MVP` で commit 済み。
- Windows JIS 表示ラベルを改善済み:
  - `docs/windows-jis-symbol-validation.md` の実機検証・補正案を Viewer 表示に反映。
  - `COLON` -> `+`、`SQT` -> `:`、`ASTERISK` -> `(`、`LEFT_PARENTHESIS` -> `)`、`RIGHT_BRACKET` -> `[`、`RIGHT_BRACE` -> `{` などを Windows JIS 出力として表示。
  - `TILDE` と `RIGHT_PARENTHESIS` は未確定扱いとして note に要検証を表示。
  - `94ba32b windows Jis表記検証_20260504` で commit 済み。
- Phase 2 source-range editing の土台を追加済み:
  - `parseKeymap` が各 layer binding に `bindingEntries[].sourceRange` を持つようにした。
  - 既存互換の `layers[].bindings` は維持。
  - `replaceBinding(source, range, nextRaw)` / `replaceBindings(source, replacements)` の純粋関数を追加。
  - Phase 2 初期の置換対象は `&kp KEYCODE` / `&trans` / `&none` に限定。
  - source-range 置換の parser smoke tests を追加。
- Phase 2 preview UI を追加済み:
  - 選択キー detail panel に source range と raw binding 編集欄を表示。
  - `&kp KEYCODE` / `&trans` / `&none` だけ編集可能にし、それ以外は read-only 表示。
  - Preview タブに対象 binding の diff と置換後 `.keymap` 全文 preview を表示。
  - 保存ボタンは disabled のまま。実ファイルへの書き込みは未実装。
- Phase 2 preview state を helper 化済み:
  - `tools/roba-keymap-viewer/src/keymap/editorPreview.js` に `buildEditorState` / `isPhase2Editable` を切り出し。
  - `tools/roba-keymap-viewer/src/keymap/editorPreview.test.js` に helper 単体テストを追加。
- Phase 2 preview editing の対象を拡張済み:
  - `&kp KEYCODE` / `&trans` / `&none` に加えて、`&mo N` / `&lt N KEYCODE` / `&mt MOD KEYCODE` の preview 置換に対応。
  - `replaceBinding` の validation と Preview UI の editable 判定は同じ `isEditableBindingExpression` を参照。
  - `&bt` など対象外 binding は read-only のまま。
- Preview UI の見やすさを改善済み:
  - 右側 detail panel をスクロール可能にし、ブラウザ 100% 表示でも `Phase 2 Preview` に到達できるようにした。
  - キーマップ上でキーを選択したとき、下の Bindings 表でも対応行をハイライトし、自動スクロールするようにした。
  - Bindings 表で検索結果など別レイヤーの行をクリックした場合も、そのレイヤーへ切り替えて選択する。
- Preview タブの diff 表示を改善済み:
  - binding 1行だけの diff に加えて、`.keymap` 内の周辺行つき Context Diff を表示するようにした。
  - `buildContextDiff(source, range, nextRaw)` を `editorPreview.js` に追加し、CRLF の source range offset を保持して行内置換位置を計算する。
  - Context Diff の helper tests を追加。
- POS38 など長い keymap 行の Context Diff を改善済み:
  - 長い `.keymap` 行は選択 binding 周辺だけを切り出し、`...` 付きで表示する。
  - POS38 の `&lt 2 SPACE` -> `&lt 1 TAB` が横スクロールの奥に隠れないようにした。
  - 長い行の切り出し幅と POS38 の表示を helper tests で固定。
- 保存処理に進む前の設計メモを `docs/zmk-studio-like-app-phase2-save-design.md` に追加済み:
  - Phase 2 初期の保存対象は preview 済みの 1 binding 置換だけに限定。
  - ブラウザから直接 filesystem を書かず、dev-only の server endpoint で保存する方針。
  - 保存前に `currentRaw` 一致、source range、Phase 2 対象 binding、再 parse、diagnostics 相当を確認する。
  - backup 作成後に一時ファイル経由で `config/roBa.keymap` を更新する。
  - 保存後も keymap-drawer 自動更新は対象外。
- 保存 helper の初期実装を追加済み:
  - `tools/roba-keymap-viewer/src/keymap/saveBindingChange.js` に `saveBindingChange` / `buildSaveDiagnostics` を追加。
  - 保存対象 path は `config/roBa.keymap` のみに制限。
  - 保存前に `currentRaw` 一致、`replaceBinding` validation、再 parse、layer/combo/macro/sensor diagnostics 維持を確認。
  - `config/.roBa.keymap.bak/` に backup を作ってから temp file 経由で保存する。
  - `tools/roba-keymap-viewer/src/keymap/saveBindingChange.test.js` に temp repo を使った helper tests を追加。
- 保存 helper を dev-only endpoint と UI に接続済み:
  - `tools/roba-keymap-viewer/vite.config.js` に `GET /__roba/keymap-source` と `POST /__roba/save-binding` を追加。
  - `POST /__roba/save-binding` は `saveBindingChange` を呼び、保存後の source を返す。
  - `tools/roba-keymap-viewer/src/App.jsx` で keymap source を state 化し、保存成功後に返却 source で再 parse する。
  - detail panel の Save button は `editorState.canEdit && editorState.changed` の時だけ有効化。
  - Save button は `import.meta.env.DEV` の時だけ有効化し、production build では実保存しない。
  - 保存成功/失敗 status を detail panel と Preview tab に表示。
  - 実ファイルを変更する保存の手動確認はまだ未実施。
- 保存 UI status 表示を polish 済み:
  - 保存中 / 成功 / 失敗の status を title・message・backup path に分けて表示するようにした。
  - detail panel と Preview tab で同じ `SaveStatusPanel` 表示を使う。
  - backup path は `Backup path` ラベル付きの別行 `code` 表示にした。
  - backup path は省略表示をやめ、折り返し表示＋必要時だけ縦スクロールにした。
  - Preview tab は status がない時も diff/source preview が残り高さを使うようにした。
- 保存フロー一式は `7408f64 Add guarded keymap save flow to roBa viewer` で commit 済み。ユーザーが push 済み。
- Reload source UI を追加済み:
  - top bar に `Reload source` button を追加。
  - `GET /__roba/keymap-source` で最新の `config/roBa.keymap` を読み直す。
  - 保存競合時の "Reload before saving." に対応できる UI として使う。
  - Reload 成功/失敗は既存の `SaveStatusPanel` で表示。
  - 上部 status strip に `Action` pill を追加し、`Reloaded source` / `Saved .keymap` / error などを常時見える位置に表示。
  - `12a1cdc Add keymap source reload action` で commit 済み。ユーザーが push 済み。
- 複数キー変更の preview/save 設計を `docs/zmk-studio-like-app-phase2-save-design.md` に追記済み:
  - pending changes list / Add draft / Clear all / Save all の最小 UI 方針を整理。
  - `replaceBindings` を使った複数 source range 置換、重複 range 拒否、1 backup でのまとめ保存、再 parse diagnostics 維持を設計。
  - combo / macro / sensor-bindings / layer rename / keymap-drawer 自動更新は別作業として維持。
- 複数キー変更の draft preview 土台を追加済み:
  - `tools/roba-keymap-viewer/src/keymap/pendingChanges.js` に pending changes helper を追加。
  - `tools/roba-keymap-viewer/src/keymap/pendingChanges.test.js` に helper tests を追加。
  - `App.jsx` に pending changes state を追加し、選択中の binding を `Add draft` / `Update draft` で積めるようにした。
  - Preview tab に `Pending Changes` list、`Remove`、`Clear all`、複数変更の Context Diff / `.keymap Preview` を表示。
  - 実ファイルへの複数保存 endpoint / `Save all` は未実装。既存の 1 binding `Save .keymap` は維持。
- 複数キー変更の保存 helper を追加済み:
  - `tools/roba-keymap-viewer/src/keymap/saveBindingChange.js` に `saveBindingChanges` を追加。
  - `replaceBindings` で複数 source range をまとめて置換し、1 backup で保存する。
  - 保存前に `currentRaw` 一致、空 changes 拒否、canonical path 制限、Phase 2 editable binding、重複 range 拒否、再 parse diagnostics 維持を確認。
  - 部分成功は作らず、1 件でも検証に失敗したら元ファイルを変更しない。
  - `tools/roba-keymap-viewer/src/keymap/saveBindingChange.test.js` に temp repo tests を追加。
- 複数キー変更の dev-only endpoint / UI 接続を追加済み:
  - `tools/roba-keymap-viewer/vite.config.js` に `POST /__roba/save-bindings` を追加。
  - endpoint は `saveBindingChanges` を呼び、保存後の source を返す。
  - Preview tab に `Save all` button を追加。
  - `Save all` は pending changes があり、pending preview が valid で、dev server 上の時だけ有効。
  - 保存成功後は返却 source で再 parse し、pending changes を clear する。
- 複数キー変更保存の往復確認済み:
  - dev server の `POST /__roba/save-bindings` に POS0/POS1 の2変更を送信し、1 backup で保存できることを確認。
  - 一時変更後の `git diff -- config/roBa.keymap` は default layer の POS0/POS1 だけに収まることを確認。
  - 同じ endpoint で POS0/POS1 を元の `&kp Q` / `&kp W` に戻し、`git diff -- config/roBa.keymap` が空になることを確認。
  - 実装差分を確認し、今回の複数保存 endpoint / UI 接続は commit-ready。
- 複数保存 endpoint / UI 接続は `f14e4b7 Add multi-binding save action to roBa viewer` で commit 済み。ユーザーが push 済み。
- Combo 編集前の read-only 可視化を追加中:
  - Combos タブで combo row を選択できるようにした。
  - 選択した combo の key positions をキーボード上でハイライトする。
  - layer 指定がある combo では、その先頭 layer へ切り替え、combo の先頭 position を選択する。
  - これは combo 編集そのものではなく、既存 combo 編集に進む前の選択・確認 UI。
- Combo read-only 可視化は `7b9fcbc Highlight selected combos in roBa viewer` で commit 済み。ユーザーが push 済み。
- 既存 combo 編集に進む前の parser metadata 土台を追加中:
  - `parseCombos` が combo node 全体の `sourceRange` / `raw` を持つようにした。
  - `key-positions` の `keyPositionsRange` を持つようにした。
  - combo `bindings` の先頭 binding を `bindingEntry` として source range 付きで持つようにした。
  - `layers` がある combo では `layersRange` を持てる形にした。
  - 既存の `name` / `positions` / `binding` / `layers` / `timeoutMs` は維持。
- Combo parser metadata は `4b0093a Track combo source ranges in roBa viewer` で commit 済み。ユーザーが push 済み。
- 既存 combo の read-only detail panel を追加中:
  - Combos タブで選択中の combo について、右 detail panel に positions / binding / layers / timeout を表示。
  - combo node range、positions range、binding range を表示。
  - combo node の raw source preview を表示。
  - 保存や編集処理は未追加。既存 combo 編集に進む前の確認 UI。
- Combo read-only detail panel は `daab44a Show selected combo source details in roBa viewer` で commit 済み。
- Combo binding / positions の preview-only 編集土台を追加中:
  - `tools/roba-keymap-viewer/src/keymap/comboPreview.js` に combo preview helper を追加。
  - combo binding は Phase 2 editable binding set の範囲だけ preview 可能。
  - combo positions は 2キー以上、重複なし、物理キー範囲内の整数リストとして validation する。
  - Combos タブの右 detail panel に binding / positions draft 入力欄を追加。
  - Preview タブで combo の Context Diff と `.keymap` preview を表示できる。
  - 保存処理は未追加。既存 key binding の pending changes / Save all とはまだ統合しない。
- Combo preview-only 編集土台は `Add combo preview editing state to roBa viewer` で commit 済み。
- Combo preview を pending changes / 保存 helper に統合中:
  - combo binding / positions draft を `Add combo draft` / `Update combo draft` で Pending Changes に積めるようにした。
  - `Save all` で通常 key binding draft と combo draft をまとめて保存できるようにした。
  - `saveBindingChanges` は `binding` / `combo-binding` / `combo-positions` の混在 changes を扱う。
  - combo binding は Phase 2 editable binding set の範囲だけ保存可能。
  - combo positions は 2キー以上、重複なし、物理キー範囲内の整数リストとして保存前にも validation する。
  - dev server endpoint `POST /__roba/save-bindings` で combo binding / positions の往復保存を確認済み。
- Combo pending/save 統合は `Save combo drafts from roBa viewer pending changes` で commit 済み。
- Combo `layers` / `timeout-ms` の preview-only 編集土台を追加中:
  - `parseCombos` が combo node 全体の `bodyRange` と `timeout-ms` 値の `timeoutMsRange` を持つようにした。
  - `timeoutMs` 値は実際に property がある時だけパース値を使い、無い時は default `50` のまま。
  - `comboPreview.js` を拡張し、combo の `layers` / `timeout-ms` を preview-only 編集できるようにした。
    - 既存 property は値を置換、未存在 property は body 末尾に挿入、空入力で property 行を削除する。
    - layers は layer index の重複なし整数リスト、timeout-ms は 1..10000 の整数として validation する。
    - 挿入位置は `}` の手前、property indent は `key-positions` 行から取得、改行は CRLF/LF を保持する。
  - Combo preview の `valid` 判定を combo 数 + layer binding 数の維持で確認するようにした。
  - Combos タブの右 detail panel に `Layers draft` / `Timeout draft (ms)` 入力欄を追加。
  - layers / timeout-ms draft は preview-only であり、`Add draft` / `Save all` の対象には現状含まないことを UI 上に注記表示。
  - parser metadata と combo preview に新規テストを追加。
- Combo `layers` / `timeout-ms` を pending changes / `Save all` に統合済み:
  - `comboPreview.js` の `buildLayersChange` / `buildTimeoutMsChange` を export。
  - `pendingChanges.js` の `buildComboDraftChanges` に `source` / `layersRaw` / `timeoutMsRaw` / `layerCount` を追加。
    - `layers-insert` / `layers-replace` / `layers-remove` / `timeout-ms-insert` / `timeout-ms-replace` / `timeout-ms-remove` を生成。
  - `upsertDraftChange` は `-insert` kind の `nextRaw` を trim しないよう修正。
  - `pendingChanges.js` の `validatePendingChange` に 6 種の新 kind を追加。
  - `saveBindingChange.js` の `validateSourceChange` に 6 種の新 kind を追加。
  - `App.jsx` の `addSelectedComboDraft` に全パラメータを渡すよう更新。
  - `App.jsx` の `selectedComboDraftIds` に layers / timeout-ms の ID を追加。
  - `App.jsx` の `saveAllPendingChanges` payload に `kind` を追加（combo-positions が正しく識別されるバグ修正を含む）。
  - Combos タブの "preview-only" 注記を削除。
  - `npm test` 50 tests / 5 suites 成功。`npm run build` 成功。dev server HTTP 200 確認。

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
- 2026-05-04 再開時確認:
  - `npm test` 成功。
  - `npm run build` 成功。生成された `dist/` は削除済み。
  - dev server は `http://localhost:5173` / `http://127.0.0.1:5173` で起動して確認済み。
  - ユーザーが `http://localhost:5173` を視覚確認して OK。
  - 確認後、dev server process と child process は停止済み。
  - `Invoke-WebRequest -UseBasicParsing http://localhost:5173` は HTTP 200。
  - `agent-browser` CLI は PATH 上になく、ブラウザ smoke check は未実施。
- Windows JIS 表示改善後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。生成された `dist/` は削除済み。
  - dev server は `http://localhost:5173` / `http://127.0.0.1:5173` で起動して確認済み。
  - ユーザーが Windows JIS 表示改善を視覚確認して OK。
  - 確認後、dev server process と child process は停止済み。
  - `Invoke-WebRequest -UseBasicParsing http://localhost:5173` は HTTP 200。
  - `agent-browser` CLI は PATH 上になく、ブラウザ smoke check は未実施。
- Phase 2 source-range parser 追加後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。生成された `dist/` は削除済み。
- Phase 2 preview UI 追加後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。生成された `dist/` は削除済み。
  - dev server は `http://127.0.0.1:5173` で HTTP 200 を確認。
  - `agent-browser` CLI は PATH 上になく、agent-browser smoke check は未実施。
  - Edge headless screenshot で画面描画を確認済み。Preview editor が detail panel に表示されることを確認。
  - dev server は `http://localhost:5173` / `http://127.0.0.1:5173` で起動中。現時点の listening process は PID 19076。
- Phase 2 preview helper 切り出し後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。14 tests / 2 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。生成された `dist/` は削除済み。
- Phase 2 preview editing 対象拡張後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。16 tests / 2 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。生成された `dist/` は削除済み。
  - dev server は `http://127.0.0.1:5173` で HTTP 200 を確認。
  - Edge headless screenshot で画面描画を確認済み。初期 raw binding が空表示になる一瞬の問題は修正済み。
- Preview UI visibility / selection sync 改善後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。16 tests / 2 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。生成された `dist/` は削除済み。
  - Edge headless screenshot で右 detail panel のスクロールバー、`Phase 2 Preview` 表示、Bindings 表の選択行ハイライトを確認済み。
  - ユーザーがブラウザ 100% 表示で右 detail panel をスクロールして `Phase 2 Preview` が見えることを確認済み。
  - ユーザーが `bindingEntries` を変更すると Preview タブの diff に反映されることを確認済み。
  - ユーザー確認後、dev server process は停止済み。
- Context Diff 改善後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。17 tests / 2 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。生成された `dist/` は削除済み。
  - Edge headless screenshot で画面描画を確認済み。
  - 確認後、dev server process と child process は停止済み。
- POS38 Context Diff 改善後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。18 tests / 2 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。生成された `dist/` は削除済み。
  - `buildContextDiff` の実出力で `&lt 2 SPACE` / `&lt 1 TAB` が短い行内に表示されることを確認済み。
  - Edge headless screenshot で画面描画を確認済み。
  - ユーザーが POS38 の Preview タブ Context Diff で変更前後が見えることを確認済み。
  - 確認後、dev server process と child process は停止済み。
- 保存設計メモ追加後:
  - ドキュメントのみの変更。`npm test` / `npm run build` は未実行。
  - 作業前の `git status --short` は clean。
- 保存 helper 追加後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。23 tests / 3 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。
  - build 生成物 `dist/` は作業ツリーに残っていないことを確認済み。
- dev-only endpoint / UI 接続後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。23 tests / 3 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。
  - dev server を `http://127.0.0.1:5173` で起動し、トップページ HTTP 200 を確認。
  - `GET /__roba/keymap-source` は HTTP 200 を確認。
  - `POST /__roba/save-binding` は不正な保存要求に HTTP 400 を返すことを確認。
  - `agent-browser` CLI は PATH 上になく、ブラウザ smoke check は未実施。
  - 確認後、dev server process と port 5173 listener は停止済み。
  - Save button の dev-only guard 追加後、再度 `npm test` 成功。23 tests / 3 suites。
  - Save button の dev-only guard 追加後、再度 `npm run build` 成功。
  - build 生成物 `dist/` は作業ツリーに残っていないことを確認済み。
  - ユーザー確認用に dev server を再起動済み。`http://127.0.0.1:5173` は HTTP 200。起動 root PID は 26728、port 5173 listener PID は 27944。
- UI 保存の往復確認後:
  - ユーザーが UI で 1 binding を保存し、元の binding に戻す往復保存に成功したことを確認。
  - `git diff -- config/roBa.keymap` は空。往復保存後、正本 keymap の内容差分は残っていない。
  - `config/.roBa.keymap.bak/` に backup が 2 件作成されたことを確認。
  - backup はローカル復旧用の生成物として扱い、`.gitignore` に `config/.roBa.keymap.bak/` を追加済み。
- 保存 UI status polish 後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。23 tests / 3 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。
  - 起動中の dev server `http://127.0.0.1:5173` は HTTP 200 を確認。
- backup path 折り返し表示対応後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。23 tests / 3 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。
  - 起動中の dev server `http://127.0.0.1:5173` は HTTP 200 を確認。
  - `git diff -- config/roBa.keymap` は空。
  - ユーザーが保存成功表示の `Backup path` 全体を画面内で確認できることを確認済み。
  - 確認操作後も `git diff -- config/roBa.keymap` は空。backup は追加生成されたが `.gitignore` 済み。
- commit-ready レビュー後:
  - 実装差分、保存 helper、保存 helper tests、保存設計メモを確認済み。
  - `tools/roba-keymap-viewer/src/App.jsx` の軽微なインデント崩れを修正。
  - `tools/roba-keymap-viewer/` で `npm test` 成功。23 tests / 3 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。
  - `git diff -- config/roBa.keymap` は空。
  - dev server は `http://127.0.0.1:5173` で起動中。port 5173 listener PID は 27944。
- Reload source UI 追加後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。23 tests / 3 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。
  - `GET /__roba/keymap-source` は HTTP 200 を確認。
  - `git diff -- config/roBa.keymap` は空。
- Action status pill 追加後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。23 tests / 3 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。
  - 起動中の dev server `http://127.0.0.1:5173` は HTTP 200 を確認。
  - `git diff -- config/roBa.keymap` は空。
- Reload source UI commit 後:
  - `12a1cdc Add keymap source reload action` で commit 済み。ユーザーが push 済み。
  - push 後のローカル作業ツリーは clean。
- 複数キー変更 preview/save 設計追記後:
  - ドキュメントのみの変更。`npm test` / `npm run build` は未実行。
  - 実装ファイルは未変更。
- 複数キー変更 draft preview 土台追加後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。27 tests / 4 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。
  - dev server を `http://127.0.0.1:5173` で起動し、HTTP 200 を確認。
  - `agent-browser` CLI は PATH 上になく、代わりに headless Edge `--dump-dom` で主要 DOM 表示を確認。
  - headless DOM で title、43 key UI、`Pending` status pill、`Add draft` button を確認。
- 複数キー変更保存 helper 追加後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。31 tests / 4 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。
  - UI / endpoint 接続は未実装のため、ブラウザ手動確認は未実施。
- 複数キー変更 dev-only endpoint / UI 接続後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。31 tests / 4 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。生成された `dist/` は削除済み。
  - dev server を `http://127.0.0.1:5173` で起動し、トップページ HTTP 200 を確認。
  - `GET /__roba/keymap-source` は HTTP 200 を確認。
  - `POST /__roba/save-bindings` は空 changes に HTTP 400 を返すことを確認。
  - `agent-browser` CLI は PATH 上になく、代わりに headless Edge `--dump-dom` で主要 DOM 表示を確認。
  - headless DOM で title、43 key UI、7 layer buttons、`Pending` status pill、`Add draft` button を確認。
  - 実ファイルを変更する複数保存の手動 UI 確認は未実施。
- 複数キー変更往復保存確認後:
  - `POST /__roba/save-bindings` で POS0/POS1 を `&kp F1` / `&kp F2` に一時変更し、HTTP 200 と `Saved 2 pending changes with a backup.` を確認。
  - 一時変更後の `git diff -- config/roBa.keymap` は `&kp Q` / `&kp W` から `&kp F1` / `&kp F2` への1行差分だけ。
  - `POST /__roba/save-bindings` で POS0/POS1 を `&kp Q` / `&kp W` に戻し、HTTP 200 と `Saved 2 pending changes with a backup.` を確認。
  - 往復後の `git diff -- config/roBa.keymap` は空。
  - `tools/roba-keymap-viewer/` で `npm test` 成功。31 tests / 4 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。生成された `dist/` は削除済み。
  - 差分レビュー済み。変更ファイルは `docs/current-work-status.md`、`tools/roba-keymap-viewer/src/App.jsx`、`tools/roba-keymap-viewer/src/styles.css`、`tools/roba-keymap-viewer/vite.config.js`。
- Combo read-only 可視化追加後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。31 tests / 4 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。生成された `dist/` は削除済み。
  - 起動中の dev server `http://127.0.0.1:5173` で headless Edge `--dump-dom` を実行し、title、`comboHighlighted` CSS、`clickableRow` CSS が配信されることを確認。
  - `git diff -- config/roBa.keymap` は空。
- Combo parser metadata 追加後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。32 tests / 4 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。生成された `dist/` は削除済み。
  - `tools/roba-keymap-viewer/src/keymap/parseKeymap.test.js` に combo source range test を追加。
  - `git diff -- config/roBa.keymap` は空。
- Combo read-only detail panel 追加後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。32 tests / 4 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。生成された `dist/` は削除済み。
  - `git diff -- config/roBa.keymap` は空。
- 2026-05-05 再開時確認:
  - 直近コミットは `daab44a Show selected combo source details in roBa viewer`。
  - `git status --short` は clean。
- Combo preview-only 編集土台追加後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。35 tests / 5 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。
  - dev server を `http://127.0.0.1:5173` で起動し、トップページ HTTP 200 を確認。
  - headless Edge `--dump-dom` で title、43 key UI、既存の主要 DOM 表示を確認。
  - `agent-browser` CLI は PATH 上になく、ブラウザ操作による手動 smoke check は未実施。
- Combo pending/save 統合後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。38 tests / 5 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。
  - dev server を `http://127.0.0.1:5173` で起動し、トップページ HTTP 200 を確認。
  - `POST /__roba/save-bindings` で `double_quotation` combo を `&kp DQT` / `17 18` に一時変更し、HTTP 200 相当の `Saved 2 pending changes with a backup.` を確認。
  - 一時変更後の `git diff -- config/roBa.keymap` は `double_quotation` の `bindings` / `key-positions` 2行だけ。
  - 同 endpoint で `&kp AT_SIGN` / `18 19` に戻し、往復後の `git diff -- config/roBa.keymap` は空。
  - headless Edge `--dump-dom` で title、43 key UI、主要 DOM 表示を確認。
  - `agent-browser` CLI は PATH 上になく、ブラウザ操作による手動 smoke check は未実施。
- Combo `layers` / `timeout-ms` preview-only 編集追加後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。44 tests / 5 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。生成された `dist/` は削除済み。
  - 追加したテスト: parser に既存 `timeout-ms` / `layers` 値 range を追える `captures timeout-ms and layers ranges when combos define them`、combo preview に insert / replace / remove / validation の 5 ケース。
  - ユーザーがブラウザで Layers / Timeout draft の挿入・validation 動作を確認済み。
  - `a87763a Add combo layers/timeout-ms preview editing to roBa viewer` で commit・push 済み。
- Combo `layers` / `timeout-ms` pending/save 統合後:
  - `tools/roba-keymap-viewer/` で `npm test` 成功。50 tests / 5 suites。
  - `tools/roba-keymap-viewer/` で `npm run build` 成功。生成された `dist/` は削除済み。
  - dev server HTTP 200 確認。`/__roba/keymap-source` HTTP 200 確認。
  - `Save all` payload に `kind` を追加（バグ修正含む）。
  - ユーザーが UI で `layers = <0>` / `timeout-ms = <100>` を `double_quotation` combo に挿入し、往復保存（追加 → Save all → 削除 → Save all）を確認。`git diff` は空。
  - `ccdcbdf Integrate combo layers/timeout-ms into pending changes and Save all` で commit・push 済み。

## 次にやること

**推奨: Context Diff の insert kind 表示修正（小規模・すぐ完了）**

### 問題
`layers-insert` / `timeout-ms-insert` などの zero-length range 挿入を pending changes に追加すると、
Preview タブの Context Diff が `- };` / `+...` と誤表示される。
実際の保存は正しく動くが、表示が誤解を招く。

### 修正方針
`tools/roba-keymap-viewer/src/keymap/pendingChanges.js` の `buildChangeContextDiff` を修正する。

```js
function buildChangeContextDiff(source, change) {
  const label = `# ${change.label || ...}`;
  // insert kind には buildLineInsertionDiff 相当の表示を使う
  if (change.kind?.endsWith("-insert")) {
    return [label, buildInsertDiff(source, change.range.start, change.nextRaw)].join("\n");
  }
  // remove kind には buildLineRemovalDiff 相当の表示を使う
  if (change.kind?.endsWith("-remove")) {
    return [label, buildRemovalDiff(source, change.range)].join("\n");
  }
  return [label, buildContextDiff(source, change.range, change.nextRaw)].join("\n");
}
```

`comboPreview.js` の `buildLineInsertionDiff` / `buildLineRemovalDiff` を export するか、
同等の関数を `editorPreview.js` に移して共有する。

### その後の候補
- macro 編集
- layer rename
- keymap-drawer 自動更新

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
- `docs/zmk-studio-like-app-phase2-source-range-editing.md`
- `docs/zmk-studio-like-app-phase2-save-design.md`
- `docs/zmk-studio-like-app-keymap-editor-trial.md`
- `docs/zmk-studio-like-app-claude-design-request.md`
- `docs/zmk-studio-like-app-claude-design-review.md`

## 更新ルール

作業を進めたら、このファイルの「最新チェックポイント」「検証状況」「次にやること」を更新する。
古い詳細はここに溜めず、必要なら個別の `docs/zmk-studio-like-app-*.md` に移す。
