# Trackball Layer Settings 実装計画レビュー資料

このドキュメントは、roBa Keymap Viewer に `automouse-layer` / `scroll-layers` 編集機能を追加するための実装計画です。
他の AI やレビュアーに設計レビューしてもらうことを目的に、現状調査・提案方針・リスクをまとめています。

この段階では実装しません。レビューでは、既存の Viewer 設計を壊さずに最小スコープで追加できるかを重点的に確認してください。

## 目的

`config/roBa.keymap` の `&trackball { ... }` ブロックにある次の設定を、Viewer UI から編集できるようにする。

```dts
&trackball {
    automouse-layer = <4>;
    scroll-layers = <5>;
};
```

対象:

- `automouse-layer = <N>;`
- `scroll-layers = <...>;`

初期実装は MVP として、既に存在する property の値を置換できるところまでを目標にする。

## 1. 現状整理

関連ファイルと責務:

- `config/roBa.keymap`
  - 正本の keymap。
  - 冒頭付近に `&trackball { automouse-layer = <4>; scroll-layers = <5>; }` がある。
- `tools/roba-keymap-viewer/src/keymap/parseKeymap.js`
  - `.keymap` の layer / combo / macro / behavior を構造化パースする。
  - 現状では `&trackball` を behavior 表示用に簡易検出している。
  - `automouse-layer` / `scroll-layers` の source range 付き構造化データはまだ返していない。
- `tools/roba-keymap-viewer/src/keymap/pendingChanges.js`
  - pending changes の preview / validation / context diff を担当する。
  - 既存の `binding`, `combo-binding`, `combo-positions`, `layers-*`, `macro-*`, `layer-rename` などを扱う。
- `tools/roba-keymap-viewer/src/keymap/saveBindingChange.js`
  - `Save all` の実保存、バックアップ、保存前後の再パース診断を担当する。
  - pending change kind ごとの server-side validation もここにある。
- `tools/roba-keymap-viewer/src/App.jsx`
  - Viewer UI、draft state、pending changes の追加、`/__roba/save-bindings` 呼び出しを担当する。
- `tools/roba-keymap-viewer/vite.config.js`
  - local dev server の save API。
  - `expectedMtime` による外部変更検知と `keymap-drawer/` dirty 検知は既に統合済み。

現状の重要な観察:

- `&trackball` は存在検出と表示ラベルまではあるが、編集対象としては未整備。
- 既存の保存設計は source range 置換を中心にできている。
- `Save all` はすでに pending changes 一括保存、バックアップ、mtime 衝突検知、drawer dirty 検知を備えている。
- したがって、新 API を増やすより既存 pending change 経路に trackball 設定用 kind を追加する方が自然。

## 2. 実装方針

最小スコープでは、`&trackball` ブロック全体を書き換えず、各 property の `<...>` の中身だけを source range 置換する。

理由:

- コメント済みの `arrows { ... }` など、将来使うかもしれない既存テキストを壊しにくい。
- 既存の `combo-positions` や `layers-replace` と同じ設計で扱える。
- 保存前後の layer / combo / macro / sensor binding count 診断をそのまま利用できる。
- 既存の backup / conflict handling / Preview diff / Undo-Redo に自然に乗る。

MVP では property の新規挿入や削除は扱わない。
現在の `config/roBa.keymap` では `automouse-layer` と `scroll-layers` が存在するため、置換だけでユーザー価値が出る。

## 3. データモデル案

pending change kind は次の 2 種類を追加する。

### `trackball-automouse-layer`

```js
{
  id: "trackball-automouse-layer",
  kind: "trackball-automouse-layer",
  label: "Trackball automouse-layer",
  range: { start, end },
  currentRaw: "4",
  nextRaw: "3"
}
```

- `range` は `<4>` 全体ではなく、中身の `4` の範囲。
- `nextRaw` は layer index 文字列。
- `currentRaw` は source から切り出した現在値。

### `trackball-scroll-layers`

```js
{
  id: "trackball-scroll-layers",
  kind: "trackball-scroll-layers",
  label: "Trackball scroll-layers",
  range: { start, end },
  currentRaw: "5",
  nextRaw: "5 6"
}
```

- `range` は `<5>` または `<5 6>` の中身。
- `nextRaw` は single-space separated な layer index リスト。
- 初期 UI が単一 layer 選択でも、データモデルと validation は複数 layer 対応にしておく。

将来候補:

- `trackball-automouse-layer-insert`
- `trackball-scroll-layers-insert`
- `trackball-automouse-layer-remove`
- `trackball-scroll-layers-remove`

ただし MVP では実装しない。

## 4. UI 設計案

配置は新規タブ `Settings` を推奨する。

理由:

- Bindings / Combos / Macros は keymap 要素の編集で、trackball 設定とは責務が違う。
- Preview タブは保存前確認・バックアップ復元の役割があるため、設定編集 UI を置くと混ざる。
- 将来的に split / pointing / viewer settings を増やす余地がある。

ユーザーフロー:

1. `Settings` タブを開く。
2. `Trackball` セクションで現在値を見る。
3. `automouse-layer` を select で選ぶ。
4. `scroll-layers` を checkbox list または multi-select で選ぶ。
5. 変更があると pending change が追加される。
6. Preview で diff を確認する。
7. `Save all` で保存する。

入力形式:

- `automouse-layer`
  - `select`
  - 表示例: `4 mouse`
  - 値は layer index。
- `scroll-layers`
  - MVP でも checkbox list を推奨。
  - 表示例: layer rail と同じ `index + name`。
  - 保存値は layer index 昇順の single-space separated list。
  - ユーザーのクリック順は保存順に反映しない。diff を安定させ、既存の combo position 入力の昇順化と揃える。

補足:

- `automouse-layer = <0>` は `zmk-pmw3610-driver` の `AUTOMOUSE_LAYER > 0` 条件により実質 disabled と扱われるため、UI では `0 default_layer (automouse disabled)` のように特別表示する。
- `scroll-layers = <0>` は disabled ではなく default layer を scroll layer として指定する意味になるため、禁止はしないが警告表示の候補にする。

エラー表示:

- 入力欄直下に短い validation message を出す。
- 全体の保存可否は既存の `pendingState.message` と `Preview` の表示に寄せる。
- `&trackball` や property が見つからない場合は、`Trackball settings are not available in this keymap.` のように read-only 表示する。

## 5. 保存ロジック設計

保存は既存 `Save all` 経路に統合する。

想定フロー:

1. `parseKeymap(source)` が `trackballSettings` を返す。
2. `App.jsx` が `trackballSettings` から draft 初期値を作る。
3. UI 変更で `upsertDraftChange()` を呼び、pending change を作る。
4. `buildPendingChangesState()` が validation と preview source 生成を行う。
5. `saveAllPendingChanges()` が `/__roba/save-bindings` に既存形式で送る。
6. server 側 `saveBindingChanges()` が `replaceKeymapChanges()` で source range 置換する。
7. 保存前後で `parseKeymap()` し、既存診断を通す。
8. backup を作成し、`config/roBa.keymap` を UTF-8 で保存する。

衝突時の挙動:

- `range` の `currentRaw` が source と一致しなければ、既存どおり reload 要求。
- `expectedMtime` がずれていれば、既存の `FILE_CHANGED` confirm を使う。
- `keymap-drawer/` が dirty なら、既存の `DRAWER_DIRTY` confirm を使う。
- trackball 設定変更は visible keymap layout を変えないため、MVP では既存 save flow の drawer 自動更新を維持してもよい。ただし実装コストが小さければ、`pendingChanges` が trackball 系 kind のみの場合は `keymap-drawer` 再生成を skip する分岐を入れる。
- 保存後の server validation では、再パース後に `trackballSettings` と対象 property が残っていることを確認する。`parseKeymap(nextSource).behaviors` の `&trackball` 表示だけではなく、新設する `trackballSettings` を正とする。

## 6. バリデーション設計

client preview 側と server save 側の両方に同等の validation を入れる。
既存実装も `pendingChanges.js` と `saveBindingChange.js` に validation が分かれているため、その流儀に合わせる。

### `automouse-layer`

- 空は禁止。
- 整数のみ。
- `0 <= N < layerCount`。
- `nextRaw` は trim 済みの数字文字列。
- server 側では置換元 range の中身も `/^\d+$/` であることを確認する。
- `0` は有効値として許可するが、driver 側では automouse disabled として扱われるため UI で明示する。

### `scroll-layers`

- 空は禁止。
- single-space separated な整数リスト。
- 重複禁止。
- 各値が `0 <= N < layerCount`。
- server 側では置換元 range の中身も `/^[\d\s]+$/` であることを確認する。
- 保存時は layer index 昇順に正規化する。
- `0` は default layer を scroll layer にする通常指定として許可する。ただし誤操作の影響が大きいため、UI で warning を出す候補にする。

### property 欠落時

MVP では編集不可にする。
将来 insert 対応を追加する場合は、`&trackball` block の body range と indentation を使って property line を挿入する。

## 7. テスト計画

Unit test:

- `parseKeymap.test.js`
  - `trackballSettings.automouseLayer.value` が `4` になる。
  - `trackballSettings.scrollLayers.values` が `[5]` になる。
  - 各 property の `sourceRange` が `<...>` の中身だけを指す。
  - `&trackball` がない場合に `trackballSettings` が `null` になる。
  - コメント内に同名 property があっても、それを編集対象として拾わない。
- `pendingChanges.test.js`
  - `trackball-automouse-layer` の preview が生成できる。
  - `trackball-scroll-layers` の preview が生成できる。
  - 範囲外 layer を拒否する。
  - `scroll-layers` の空・重複・不正空白を拒否する。
  - `scroll-layers` を昇順に正規化する。
  - `nextRaw === currentRaw` の NoOp が pending から外れる。
- `saveBindingChange.test.js`
  - `automouse-layer` の保存が成功する。
  - `scroll-layers` の保存が成功する。
  - `currentRaw` mismatch を拒否する。
  - 不正な source range を拒否する。
  - 保存後に `trackballSettings` と対象 property が残っていることを検証する。
  - 保存前後で layer / combo / macro / sensor binding count が維持される。

Manual check:

- Viewer を起動する。
- `Settings` タブで `automouse-layer` を変更する。
- `scroll-layers` を変更する。
- Preview に `&trackball` 付近の diff が出る。
- `Save all` で保存できる。
- Reload 後、UI に保存後の値が反映される。
- `config/roBa.keymap` の該当行以外が変わっていないことを確認する。

Verification commands:

```powershell
cd tools/roba-keymap-viewer
npm test
npm run build
```

必要に応じて dev server 起動後に HTTP 200 とブラウザ操作を確認する。

## 8. 段階的実装ステップ

### Step 1: parser 拡張

- `parseTrackballSettings(source)` を追加する。
- `findBlock(source, "&trackball")` を使い、block body 内の property を探す。
- `getAnglePropertyInfo()` 相当の helper を source range 付きで再利用または拡張する。
- property scan は comment-aware にする。line/block comment を削除して offset を詰めるのではなく、コメント部分を空白で mask して source range を維持する。
- `parseKeymap()` の戻り値に `trackballSettings` を追加する。

### Step 2: pending change 対応

- `pendingChanges.js` に `trackball-automouse-layer` と `trackball-scroll-layers` の validation を追加する。
- `buildPendingChangesState()` の `layerCount` を使って範囲検証する。
- context diff は既存 `buildContextDiff()` に任せる。

### Step 3: save 対応

- `saveBindingChange.js` の `validateSourceChange()` に 2 kind を追加する。
- server 側でも layer index 範囲、重複、source range の妥当性を検証する。
- `replaceKeymapChanges()` は既存の generic replacement をそのまま使う。

### Step 4: UI 追加

- `Settings` タブを追加する。
- `TrackballSettingsPanel` を追加する。
- draft state を追加し、source reload 時に初期化する。
- `upsertDraftChange()` / `removeDraftChange()` の既存パターンで pending changes に接続する。
- `upsertDraftChange()` の既存 NoOp 判定に乗せ、値が元に戻ったら pending change を消す。
- `automouse-layer = <0>` は disabled として表示し、`scroll-layers = <0>` は default layer scroll の warning 候補にする。

### Step 5: テスト追加

- parser / pending / save の unit test を追加する。
- UI の細かい状態は既存の手動確認中心でよい。

### Step 6: 手動確認

- `npm test`
- `npm run build`
- dev server HTTP 200
- Settings 変更、Preview、Save all、Reload の一連操作

## 9. リスクと回避策

### コメント内 property を誤検出する

`&trackball` ブロック内にはコメントアウトされた設定例がある。
単純な global regexp は避け、`findBlock(source, "&trackball")` で対象 block を絞る。
MVP で line comment / block comment を避ける property scanner を入れる。
コメント部分は空白で mask し、元 source への offset を維持する。

### `&trackball` 全体置換でコメントや書式を壊す

block 全体の再生成はしない。
`<...>` の中身だけを range 置換する。

### `scroll-layers` の将来複数対応で手戻りする

UI が単一選択でも、内部表現と validation は最初から複数 layer 対応にする。
MVP UI は checkbox list にしておくと将来拡張が自然。

### 既存機能への影響

新しい pending change kind は source range 置換のみ。
Bindings / combo / macro / layer rename の処理には触れない。
保存後診断も既存の count stable check を維持する。
`config/roBa.json` は keymap-editor のレイアウト metadata であり、trackball 設定変更では触らない。

### property 欠落 keymap で壊れる

MVP では read-only 表示にする。
insert 対応は将来タスクに分ける。

## 10. 実装着手用チェックリスト

- [ ] `parseKeymap.js` に `parseTrackballSettings()` を追加する。
- [ ] comment-aware property scanner を追加し、コメント内同名 property を拾わないようにする。
- [ ] `parseKeymap.test.js` に trackball parser test を追加する。
- [ ] `pendingChanges.js` に trackball validation を追加する。
- [ ] `pendingChanges.test.js` に valid / invalid case を追加する。
- [ ] `saveBindingChange.js` に trackball kind の server validation を追加する。
- [ ] `saveBindingChange.test.js` に保存成功・失敗 test を追加する。
- [ ] `App.jsx` に `Settings` タブと `TrackballSettingsPanel` を追加する。
- [ ] `automouse-layer = <0>` を disabled として表示する。
- [ ] `scroll-layers` を昇順保存に固定する。
- [ ] 保存後に `trackballSettings` と対象 property が残っていることを検証する。
- [ ] trackball 系 kind のみの保存で `keymap-drawer` 再生成を skip するか、既存挙動維持にするか実装直前に確定する。
- [ ] `config/roBa.json` は触らない。
- [ ] Reload / Restore / Save 後に draft が最新 source に同期されることを確認する。
- [ ] `npm test` を通す。
- [ ] `npm run build` を通す。
- [ ] dev server で Settings → Preview → Save all → Reload を手動確認する。
- [ ] 実装後に `docs/current-work-status.md` を更新する。

## MVP 案

最短で価値を出す MVP は、既存 `&trackball` block にある `automouse-layer` と `scroll-layers` の値だけを Viewer から変更できるようにすること。

- property insert / remove はしない。
- block 全体再生成はしない。
- pending changes と Save all の既存経路に統合する。
- UI は `Settings` タブに `Trackball` セクションを追加する。
- `scroll-layers` は内部的には複数対応にして、UI も checkbox list にする。
- property scan は comment-aware にする。
- `automouse-layer = <0>` は disabled として UI に表示する。
- `scroll-layers` は layer index 昇順で保存する。

## 将来拡張案

- `automouse-layer` / `scroll-layers` が未定義の場合の property insertion。
- property remove。
- `scroll-layers` の並び順やプリセット UI。
- コメントアウトされている `arrows { ... }` のような trackball child config の構造化表示。
- trackball 設定専用の保存診断項目。
- 実機確認結果を `docs/viewer-to-device-guide.md` または別ログに整理する。

## レビューしてほしい観点

- `Settings` タブ新設が UI 情報設計として妥当か。
- `trackball-*` pending change kind を増やす方針が既存設計に合っているか。
- `<...>` の中身だけを source range 置換する方針で安全性が十分か。
- `scroll-layers` を MVP から複数対応にしておく判断が過剰でないか。
- property 欠落時を MVP で read-only にする判断が妥当か。
- trackball 系 kind のみの保存で `keymap-drawer` 自動更新を skip するか、既存 save flow のまま維持するか。

## 11. レビュー結果の採用方針

Claude (Opus) による初回レビューと Codex 再レビューを踏まえた採用方針。

### 11.1 コメント aware なプロパティスキャン

`getAnglePropertyInfo` ([tools/roba-keymap-viewer/src/keymap/parseKeymap.js:78-93](tools/roba-keymap-viewer/src/keymap/parseKeymap.js#L78-L93)) は単純な regex 実装で、コメント内のマッチをスキップしない。

- 現 `config/roBa.keymap` では `automouse-layer` / `scroll-layers` というプロパティ名がコメント内に存在せず、たまたま安全。
- ただし [config/roBa.keymap:15-26](config/roBa.keymap#L15-L26) に `// arrows { layers = <3>; ... }` のコメントアウト例が並んでおり、将来「`scroll-layers` の例をコメントで併記する」運用が始まると壊れる。
- 採用方針: MVP で comment-aware scanner を入れる。
- 実装方針: コメントを削除して offset を詰めるのではなく、line/block comment 部分を空白で mask して source range を維持する。
- テスト: コメント内に同名 property があるケースを追加する。

### 11.2 `automouse-layer = <0>` の仕様確認

plan §6 では `0 <= N < layerCount` を許容としているが、`zmk-pmw3610-driver` 側で `automouse-layer = <0>` が「無効化」など特別な意味を持つ可能性がある。

- 確認結果: `kumamuk-git/zmk-pmw3610-driver` の `pmw3610.c` では `AUTOMOUSE_LAYER > 0` の条件で automouse 処理が有効になるため、`automouse-layer = <0>` は実質 disabled と判断する。
- 採用方針: `0` は許可し、UI で disabled と明示する。
- `scroll-layers = <0>` は disabled ではなく default layer を scroll layer にする指定として扱う。許可はするが、UI warning の候補にする。

### 11.3 `scroll-layers` の保存形式（並び順）

plan §3 / §4 では「昇順または UI 表示順の single-space separated list」と曖昧。

- 採用方針: 昇順固定。
- 理由: diff 安定化と、ユーザー操作順による noise diff 防止。
- 既存の SVG combo position 入力もクリック後に昇順化しており、Viewer の既存挙動とも合う。

### 11.4 「変更なし」を pending change にしない

UI で同じ値を再選択しただけで pending change が増えるのを防ぐため、`nextRaw === currentRaw` の場合は upsert ではなく remove する NoOp 判定を Step 4 で明示する。

- 採用方針: 既存の `upsertDraftChange()` の NoOp 判定に乗せる。
- 実装時は trackball 用 builder が `currentRaw` と正規化済み `nextRaw` を同じ形式で渡すようにする。

### 11.5 保存後の `&trackball` 残存チェック

[tools/roba-keymap-viewer/src/keymap/saveBindingChange.js:347-427](tools/roba-keymap-viewer/src/keymap/saveBindingChange.js#L347-L427) の各 kind は「保存前後の count stable」を担保している。trackball property 置換は layer/combo/macro/sensor count を変えないはずだが、`parseKeymap` が `&trackball` を behavior として返している ([tools/roba-keymap-viewer/src/keymap/parseKeymap.js:270-278](tools/roba-keymap-viewer/src/keymap/parseKeymap.js#L270-L278)) ため、server validation で次を追加で確認したい。

- 採用方針: 追加する。
- 確認対象は `parseKeymap(nextSource).behaviors` の表示用 `&trackball` だけでなく、新設する `trackballSettings` と対象 property の存在とする。
- これにより、source range 事故で `&trackball` 設定を壊した場合に server 側で拒否できる。

### 11.6 `keymap-drawer` 自動更新の扱い

plan §5 では「visible layout を変えないが既存 save flow に乗るなら drawer 自動更新は維持」としているが、これは trackball 設定 1 行の変更でも `roBa.svg` が再生成・コミット対象になることを意味する。

- 候補:
  - (a) 既存挙動維持（drawer 出力は実質変わらないので無害）。
  - (b) trackball 系 kind では drawer 再生成をスキップする分岐を入れる。
- 採用方針: MVP では既存挙動維持でも許容。ただし実装コストが小さいため、余力があれば `pendingChanges` が trackball 系 kind のみの場合だけ drawer 再生成を skip する。
- 実装前の最終判断: 保存フローに分岐を増やす影響と、無駄な `roBa.svg` 再生成差分を減らす価値を比較して決める。
- 計画上は checklist に「skip するか既存維持か確定する」を残す。

### 11.7 ドキュメント更新の checklist 漏れ

`AGENTS.md` のルールに従い、実装後に `docs/current-work-status.md` を更新するタスクを §10 のチェックリストに追加する。

- 採用方針: 追加済み。

### 11.8 `config/roBa.json` (keymap-editor metadata) との関係

trackball 設定は keymap-editor のレイアウト metadata には影響しないため `config/roBa.json` は触らない、と plan に 1 行明記しておく（将来の AI / レビュアーが迷わないため）。

- 採用方針: 追加済み。実装では `config/roBa.json` を触らない。

## 12. 実装前の最終方針

- MVP で実装する:
  - `automouse-layer` / `scroll-layers` の既存 property 値置換。
  - comment-aware property scan。
  - `scroll-layers` の昇順保存。
  - `automouse-layer = <0>` の disabled 表示。
  - server 側の `trackballSettings` 残存チェック。
- MVP では実装しない:
  - property insert / remove。
  - `arrows { ... }` など trackball child config の編集。
  - `scroll-layers = <0>` 指定時の warning UI（許可はするが警告表示は将来タスク）。
- 実装直前に判断する:
  - trackball 系 kind のみの保存で `keymap-drawer` 再生成を skip するか、既存 save flow を維持するか。
  - default は **(a) 既存挙動維持**。drawer 出力は実質変わらないので skip 実装は将来タスクで十分。

## 13. 2 回目レビューで挙がった実装上の注意（plan 修正は不要、実装時に参照）

Claude (Opus) による再レビューで残った微小な懸念。plan の方針自体は固まっており、以下は実装段階で意識する事項。

### 13.1 comment-aware scanner の影響範囲を局所化する

§8 Step 1 / §9 で「property scan を mask 方式で comment-aware にする」と決めたが、適用範囲を以下の方針で絞る。

- `getAnglePropertyInfo` 自体は差し替えない。
- `parseTrackballSettings` 専用に comment-aware helper を新設する。
- 理由: 既存の combos / macros / behaviors の parse は現状で問題が出ていない。共通化のリスクを避け、影響を局所化する。
- 将来共通化する場合は、既存 parser の test を一通り通してから差し替える順序にする。

### 13.2 mask 実装は改行を保持する

「コメント部分を空白で mask」する際、source range を維持するために以下を守る。

- mask 後の文字列長は元と完全に一致させる。
- 改行 (`\n`, `\r`) はそのまま保持する。それ以外の文字を半角スペースに置換する。
- 理由: `/* multi\nline */` の `\n` をスペースに置換すると line 番号がずれ、エラー表示や future の line-based 処理が壊れる可能性がある。
- parser test に「`/* ... \n ... */` を `&trackball` block 内に含む」ケースを 1 本追加する。

### 13.3 `scroll-layers = <0>` warning UI は MVP 外

§4 / §6 / §11.2 で「warning 候補にする」とした表現は、MVP では実装しない方針として確定する。

- 採用方針: 値としては許可、warning UI は将来タスク。
- 理由: warning UI を作ると専用の validation / 表示 / テストが必要になり MVP のスコープを膨らませる。
- §12 の「MVP では実装しない」リストに反映済み。
