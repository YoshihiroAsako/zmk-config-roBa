# Phase 2 Save Design

このメモは、roBa Keymap Viewer に `.keymap` 保存処理を入れる前の最小設計です。
現時点の実装は preview/diff までで、実ファイルへの書き込みはまだ入れない。

## 目的

- `config/roBa.keymap` を正本のまま扱う。
- UI で preview 済みの 1 binding 置換だけを保存対象にする。
- 保存前にバックアップを作り、保存後に再 parse と diagnostics を確認する。
- `.keymap` 全体の再生成はしない。既存のコメント、空行、列揃え、CRLF/LF を保持する。

## 保存対象

Phase 2 初期で保存してよい対象は、既に preview で扱っている binding expression だけに限定する。

- `&kp KEYCODE`
- `&trans`
- `&none`
- `&mo N`
- `&lt N KEYCODE`
- `&mt MOD KEYCODE`

保存しない対象:

- combo / macro / behavior / sensor-bindings の編集
- layer 追加・削除・リネーム
- custom behavior binding
- 複数キー同時編集
- `config/roBa.json` や keymap-drawer 出力の更新

## 実装方針

ブラウザ UI から直接 filesystem を書かず、ローカル dev server 側に dev-only save endpoint を置く。
Vite middleware か小さな Node helper のどちらでもよいが、最初は `tools/roba-keymap-viewer/vite.config.js` の `configureServer` に閉じるのが最小。

想定 endpoint:

- `POST /__roba/save-binding`
- request body:
  - `sourcePath`: 固定で `config/roBa.keymap` のみ許可
  - `range`: `{ start, end }`
  - `currentRaw`: UI が選択時に読んだ binding
  - `nextRaw`: 保存したい binding
- response body:
  - `ok`
  - `message`
  - `backupPath`
  - `diagnostics`

server 側は request の `sourcePath` を信用しない。
実際に書けるファイルは repo root 配下の `config/roBa.keymap` だけに固定する。

## 保存手順

1. server 側で現在の `config/roBa.keymap` を UTF-8 text として読む。
2. `range` が現在ファイル内の 1 binding expression 全体を指すことを `replaceBinding` と同じ条件で検証する。
3. `source.slice(range.start, range.end).trim()` が `currentRaw` と一致することを確認する。
4. `nextRaw` が Phase 2 対象 binding で、trim 済みかつ改行・`;`・`<`・`>` を含まないことを確認する。
5. `replaceBinding(source, range, nextRaw)` で next source を作る。
6. next source を `parseKeymap` で再 parse する。
7. layer count と各 layer の binding count が保存前と一致することを確認する。
8. diagnostics 相当の key count / layer count / combo count / macro count / sensor binding count を確認する。
9. `config/.roBa.keymap.bak/YYYYMMDD-HHMMSS.roBa.keymap` のような backup を作る。
10. 一時ファイルへ next source を書き、可能なら rename で `config/roBa.keymap` に反映する。
11. 保存後に再読込して、保存後ファイルの対象 range 付近が `nextRaw` になっていることを確認する。

## UI 方針

- Save button は `editorState.changed && editorState.canEdit` の時だけ有効化する。
- 保存前に Context Diff と `.keymap Preview` が表示されている状態を維持する。
- 保存成功後は `config/roBa.keymap` を再取得し、parse 結果から UI state を作り直す。
- 保存成功時は backup path を表示する。
- 保存失敗時は実ファイルを書かず、server からの error message を detail panel と Preview tab に表示する。
- 保存後も keymap-drawer は自動更新しない。見た目が変わる変更を導入するまでは対象外。

## 競合・失敗時の扱い

- `currentRaw` が現在ファイルと一致しない場合は保存しない。ユーザーに再読み込みを促す。
- 再 parse 後に binding count が変わった場合は保存しない。
- backup 作成に失敗した場合は保存しない。
- 一時ファイル書き込みや rename に失敗した場合は、元ファイルを変更しない状態を優先する。
- 保存後検証に失敗した場合はエラーを表示し、backup path を明示する。自動 rollback は Phase 2 初期では入れない。

## テスト計画

純粋関数テスト:

- `replaceBinding` 後に parse できる。
- 保存前後で layer count と各 layer binding count が一致する。
- `currentRaw` 不一致を保存拒否できる。
- unsupported binding を保存拒否できる。
- overlap や壊れた source range を保存拒否できる。

server helper テスト:

- temp directory 上の keymap file に対して backup が作られる。
- backup 作成後に next source が書かれる。
- `config/roBa.keymap` 以外の path を拒否する。
- backup 失敗時に元ファイルを変更しない。

手動確認:

- `npm test`
- `npm run build`
- dev server で 1 binding を変更し、Preview の diff と保存後 UI が一致すること。
- 保存後の `git diff config/roBa.keymap` が対象 binding だけに収まること。

## 実装順

1. server 側で使う `saveBindingChange` helper を純粋に近い形で作る。
2. temp file を使った helper test を追加する。
3. dev-only endpoint を Vite middleware として追加する。
4. UI の Save button を endpoint につなぐ。
5. 保存成功後の再取得・再 parse・diagnostics 表示を入れる。
6. 手動確認後に `docs/current-work-status.md` を更新する。
