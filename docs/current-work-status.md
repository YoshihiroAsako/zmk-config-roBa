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

## 次にやること

優先順:

1. 保存処理に進む前に、バックアップ付き保存・再 parse・diagnostics 維持の設計を小さくまとめる。
2. 保存処理は preview/diff とテストが安定するまで入れない。

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
- `docs/zmk-studio-like-app-keymap-editor-trial.md`
- `docs/zmk-studio-like-app-claude-design-request.md`
- `docs/zmk-studio-like-app-claude-design-review.md`

## 更新ルール

作業を進めたら、このファイルの「最新チェックポイント」「検証状況」「次にやること」を更新する。
古い詳細はここに溜めず、必要なら個別の `docs/zmk-studio-like-app-*.md` に移す。
