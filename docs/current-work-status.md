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

## 次にやること

優先順:

1. 保存対象を広げる前に、複数キー変更の preview/save 設計を短くまとめる。
2. 設計では `replaceBindings` を使った複数 source range 置換、重複 range 拒否、まとめて backup、再 parse diagnostics 維持を扱う。
3. UI はいきなり保存対象を増やさず、まず draft changes list / pending changes / clear all / save all の最小形を検討する。
4. combo / macro / sensor-bindings / layer rename / keymap-drawer 自動更新は、複数キー保存とは別作業に分ける。

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
