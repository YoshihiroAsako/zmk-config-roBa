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

## 複数キー変更への拡張メモ

1 binding 保存が実機 UI で往復確認できた後の拡張案。
ここでも保存対象は Phase 2 editable binding に限定し、combo / macro / sensor-bindings / layer rename / keymap-drawer 自動更新は別作業に分ける。

### 目的

- 複数の通常キー binding を一度 draft として保持し、まとめて preview できるようにする。
- 実ファイル保存は `Save all` の 1 回だけにし、backup も 1 回だけ作る。
- 既存の source range 置換方式を維持し、`.keymap` 全体の再生成はしない。

### draft model

UI 側に pending changes list を持つ。
各 item は最低限この形にする。

- `id`: layer index と key position から作る安定 ID。例: `layer-2-pos-38`
- `layerIndex`
- `position`
- `range`: 選択時の `bindingEntries[].sourceRange`
- `currentRaw`: 選択時点の binding
- `nextRaw`: draft binding

同じ `id` の draft を再編集した場合は上書きする。
`nextRaw === currentRaw` に戻った draft は pending list から消す。

### preview

複数 preview は `replaceBindings(source, replacements)` を使う。
UI では `source` に対して pending changes 全件を適用した `nextSource` を作り、再 parse して diagnostics を表示する。

preview 時に拒否する条件:

- pending list が空。
- いずれかの `nextRaw` が Phase 2 editable binding ではない。
- いずれかの `range` が 1 binding expression 全体を指していない。
- `range` が重複している。
- 再 parse 後に layer count / layer binding counts / combo count / macro count / sensor binding count が変わる。

Context Diff はまず変更ごとの小さな diff list でよい。
`.keymap` 全文 preview は残してもよいが、複数変更時は表示が長くなるため、主 UI は pending changes と per-change Context Diff を優先する。

### save all endpoint

1 binding endpoint とは別に、dev-only の `POST /__roba/save-bindings` を追加する。

request body:

- `sourcePath`: 固定で `config/roBa.keymap` のみ許可
- `changes`: pending changes list
  - `range`
  - `currentRaw`
  - `nextRaw`

server 側の保存手順:

1. 現在の `config/roBa.keymap` を UTF-8 text として読む。
2. 各 change の `source.slice(range.start, range.end).trim()` が `currentRaw` と一致することを確認する。
3. `replaceBindings(source, changes)` で next source を作る。
4. before / after を parse し、1 binding 保存と同じ diagnostics が維持されることを確認する。
5. backup を 1 件だけ作る。
6. temp file 経由で `config/roBa.keymap` を更新する。
7. 保存後 source を返し、UI は pending changes を clear して再 parse する。

部分成功は作らない。
1 件でも検証に失敗したら実ファイルを書かず、ユーザーに `Reload source` を促す。

### 最小 UI

- detail panel の保存ボタンは、まず `Add draft` / `Update draft` に変える。
- top bar か Preview tab に pending count を表示する。
- Preview tab に `Pending changes` list を表示する。
- 各 pending item に `Remove` を置く。
- list 全体に `Clear all` と `Save all` を置く。
- `Save all` は dev mode かつ pending preview が valid の時だけ有効にする。

最初の実装ではドラッグ編集、複数選択、一括キーコード入力は入れない。
既存の「1キーを選んで raw binding を編集する」流れを draft に積むだけにする。

### テスト計画

純粋関数テスト:

- `replaceBindings` が複数 range を後ろから置換し、offset ずれを起こさない。
- 重複 range を拒否する。
- unsupported binding を含む場合に拒否する。
- 複数置換後も parse と diagnostics が維持される。

server helper テスト:

- 複数 change を 1 backup で保存できる。
- 1 件の `currentRaw` 不一致で全体を拒否し、元ファイルを変更しない。
- 重複 range で全体を拒否し、元ファイルを変更しない。

手動確認:

- 2 つ以上のキーを draft に積み、Preview tab で全変更が見えること。
- `Save all` 後に `config/roBa.keymap` の差分が対象 binding だけに収まること。
- `Reload source` 後に pending changes が安全に扱われること。
