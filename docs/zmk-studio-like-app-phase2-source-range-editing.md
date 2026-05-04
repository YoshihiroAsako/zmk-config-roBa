# Phase 2 Source-Range Editing Plan

このメモは、roBa Keymap Viewer の Phase 2 を安全に進めるための実装順です。
Phase 2 の目的は、`.keymap` 全体を再生成せず、選択した binding expression だけを置換できる土台を作ることです。

## 方針

- `config/roBa.keymap` を正本として扱う。
- parser は各 layer binding に `sourceRange` を持たせる。
- 保存処理は AST serialize ではなく、元ファイル文字列への slice 置換で行う。
- 最初の編集対象は、1 キーに対応する binding expression 全体だけに限定する。
- UI からの保存は急がず、まず変更後 `.keymap` preview と diff 表示を作る。

## 最初に扱う binding

最初の対応対象:

- `&kp KEYCODE`
- `&trans`
- `&none`

次の対象:

- `&mo N`
- `&lt N KEYCODE`
- `&mt MOD KEYCODE`

Phase 2 初期では扱わない:

- combo 編集
- macro 編集
- custom behavior の新規作成
- behavior 定義そのものの編集
- sensor-bindings 編集
- layer 追加・削除・リネーム

## 実装順

1. `parseKeymap` が各 binding に `{ raw, sourceRange }` を持てるようにする。
2. 既存の `layers[].bindings` は表示互換のため維持し、必要なら `layers[].bindingEntries` を追加する。
3. `replaceBinding(source, range, nextRaw)` の純粋関数を追加する。
4. 1 キー置換で変更対象 binding 以外の文字列が変わらないテストを追加する。
5. 複数置換用に、range が重ならないことと後ろから置換することをテストする。
6. 置換後に再 parse し、layer count と各 layer の binding count が変わらないことを検証する。
7. UI にはまず save ではなく preview/diff を出す。
8. preview/diff が安定してから、バックアップ付き保存を検討する。

## テスト観点

- 編集なしでは出力が完全一致する。
- `&kp A` を `&kp B` に変えても、変更箇所以外は完全一致する。
- `&trans` と `&none` を置換できる。
- `&kp LS(INT_YEN)` のような括弧付き keycode を 1 binding として扱う。
- `&lt_to_layer_0 6 INT_HENKAN` のような custom binding は初期 UI では read-only のまま保持する。
- コメント、空行、列揃え、include、マクロ定義が消えない。
- LF/CRLF と BOM を保持する。
- 不正な `nextRaw` は書き込まず、preview 生成前にエラーにする。

## UI の最小形

最初の UI は小さくする。

- 選択キーの detail panel に raw binding を表示する。
- 対応可能な binding だけ edit control を有効化する。
- Windows JIS 表示ラベルと raw ZMK binding を併記する。
- 変更後は `.keymap` preview と diff を表示する。
- 保存ボタンは、preview/diff のテストが安定するまで disabled または未実装にする。

## 保存を入れる前の合格基準

- `npm test` が通る。
- `npm run build` が通る。
- 1 キー変更の diff が対象 binding だけに収まる。
- 変更後 source を再 parse して diagnostics が OK のまま。
- read-only 表示、Markdown preview、Windows JIS 表示が壊れていない。

