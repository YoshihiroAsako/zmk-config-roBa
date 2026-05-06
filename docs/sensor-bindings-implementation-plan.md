# エンコーダー回転 (sensor-bindings) 編集 実装計画

Task B（次回着手）の詳細計画。`docs/current-work-status.md` の「次にやること」から参照。

## 目的とスコープ

### 目的

現在 read-only の **Sensors タブ**で、各レイヤーの `sensor-bindings = <&inc_dec_kp X Y>;` の inc/dec keycode を編集・保存できるようにする。

### 編集対象（現状）

`config/roBa.keymap` 内の以下 2 箇所:

- `default_layer`: `sensor-bindings = <&inc_dec_kp PG_UP PAGE_DOWN>;`
- `ARROW`: `sensor-bindings = <&inc_dec_kp LC(PAGE_UP) LC(PAGE_DOWN)>;`

### MVP スコープ

- `&inc_dec_kp X Y` 形式のみサポート。
- inc/dec の keycode は **`&kp` 相当のキーコード（modifier 込みの `LC(LEFT)` / `LS(TAB)` 等を含む）** のみ。
- 対象 layer は `sensor-bindings` を実際に持っているもののみ列挙（追加・削除は MVP 外）。
- `&inc_dec_cp`（consumer-press）への切替は MVP 外。
- ハードウェアレベルの方向反転（`boards/shields/roBa/*.overlay` の極性）は **対象外**。

### Task B で実現できる挙動の例

`&kp` 相当の keycode で表現できる動作はすべて可能:

- ページ上下スクロール（現状）
- カーソル移動: `LEFT_ARROW` / `RIGHT_ARROW` 等
- 単語単位カーソル移動: `LC(LEFT)` / `LC(RIGHT)`
- ブラウザのタブ切替: `LC(LS(TAB))` / `LC(TAB)`
- Undo / Redo: `LC(Z)` / `LC(Y)`
- ズーム: `LC(EQUAL)` / `LC(MINUS)`

### Task B の範囲外（別タスク候補）

- **Consumer code（音量 / メディア / 明るさ）**: `keycodeCatalog.js` に Consumer / Media カテゴリが無ければ別タスクでカタログ拡張。Task B では既存カタログにある keycode のみ。
- **マウスホイール（`&msc`）**: 別 behavior。別タスクで対応。
- **`&inc_dec_cp` への切替**: 別タスク。
- **ハードウェアレベルの方向反転**: `.overlay` / `.dtsi` 編集が必要。Sensors タブからは触らない。UI 上に「全レイヤー反転は roBa.overlay 編集が必要」旨を注記する。

## データモデル

### parseKeymap.js

`layer.sensorBindings` の構造を `string[]` から構造化オブジェクト配列に変更:

```js
sensorBindings: [
  {
    raw: "&inc_dec_kp PG_UP PAGE_DOWN",
    sourceRange: { start, end },   // <...> 内側の範囲
    behavior: "&inc_dec_kp",
    incKey: "PG_UP",                // raw token (modifier 含む)
    decKey: "PAGE_DOWN",
  },
  ...
]
```

実装メモ:

- `getAnglePropertyInfo(layer.body, "sensor-bindings", layer.bodyStart)` を再利用して value と sourceRange を取得。
- 中身を `splitBindingEntries` で分割し、最初の entry を `&inc_dec_kp X Y` としてトークン分解。
- `&inc_dec_kp` 以外の場合は `behavior` だけ埋めて `incKey/decKey` は `null`、UI 側で disable 表示。
- 後方互換のため `raw` プロパティは必ず残す。

### pendingChanges.js

新 kind: `sensor-binding`

```js
{
  id: `layer-${layerIndex}-sensor-binding`,
  kind: "sensor-binding",
  label: `${layerName} sensor-binding`,
  layerIndex,
  range: sensorBinding.sourceRange,   // <...> 内側の範囲
  currentRaw: "&inc_dec_kp PG_UP PAGE_DOWN",
  nextRaw:    "&inc_dec_kp LEFT_ARROW RIGHT_ARROW",
}
```

- builder: `buildSensorBindingDraftChange({ layer, sensorBinding, incKey, decKey })`
- `validatePendingChange` に `sensor-binding` 分岐を追加:
  - `nextRaw` が `^&inc_dec_kp \S+ \S+$`（trim 後、単一スペース区切り）
  - inc/dec keycode は `&kp` Picker で生成可能なトークン（`LS(PSCRN)` 等の nested modifier 込み）

### saveBindingChange.js

- `kind === "sensor-binding"` の `validateSourceChange` 分岐を追加。
- 対象 source range が `&inc_dec_kp X Y` のパターンに一致することを確認。
- 置換後 `parseKeymap` で当該 sensor-binding が `&inc_dec_kp X Y` 形式で残存していることを `validateSensorBindingPreserved` で検証（命名は trackball preserved 検証に合わせる）。
- `replaceKeymapChanges` の `sourceChanges` フィルタは `kind !== "binding"` なので自動的に拾われる。
- `buildSaveDiagnostics` の `countSensorBindings` は既にあるので件数差分検証はそのまま動く。

## UI 設計（App.jsx）

### Sensors タブの再構成

現在の単純 read-only テーブルから `splitPanel`（左: layer 一覧、右: 編集 detail）形式へ。Combos / Macros タブと同じ構造。

- **左ペイン**: `sensor-bindings` を持つ layer の一覧（layer name + 現在の inc/dec を表示）。
- **右ペイン（layer 選択時）**:
  - **Inc keycode**: 現在値表示 + `Pick` ボタン
  - **Dec keycode**: 現在値表示 + `Pick` ボタン
  - **Swap inc/dec ボタン**: 1 クリックで incKey と decKey を入れ替えて draft に反映（layer ごとの方向反転 UX）
  - **Preview**: `&inc_dec_kp <inc> <dec>` の組み立て結果
  - **Add to pending** / **Remove draft** ボタン
  - 注記: 「全レイヤー反転は `boards/shields/roBa/roBa.overlay` 編集が必要」

### state

```js
const [sensorDrafts, setSensorDrafts] = useState({}); // { [layerIndex]: { incKey, decKey } }
```

- 初期化: `document.layers` 走査して sensor-bindings を持つ layer 分だけ `{ incKey, decKey }` を埋める。
- source reload / save 成功 / restore 後にリセット（既存の `trackballDraft` 初期化と同じパターン）。

### Picker への接続

既存 `KeycodePicker` を拡張し、**`restrictTo: ["&kp"]` プロップを追加**して KP 以外の Behavior 切替（LT/MT/MKP）を非表示にする制限モードを設ける。

理由:

- sensor-binding の用途では LT/MT/MKP は不要。
- Picker の Behavior 切替を出したまま使うと、誤って LT 等を選んだ時の挙動（keycode のみ抽出 vs エラー）が曖昧になる。
- `restrictTo` を追加することで、将来同様のシーンでも再利用できる。

`pickerContext` に新 type を追加:

```js
setPickerContext({ type: "sensor-inc", layerIndex });
setPickerContext({ type: "sensor-dec", layerIndex });
```

- `pickerInitialBinding` は `&kp ${incKey}` の形にして既存の `&kp` 修飾キー対応を流用。
- onSelect で受け取った binding（例: `&kp LS(PSCRN)`）から `&kp ` を剥がして keycode token を `sensorDrafts[layerIndex].incKey` / `decKey` にセット。

### 設計判断（確定済み）

- ✅ Picker の制限: `restrictTo: ["&kp"]` プロップを Picker に追加して KP のみ表示。
- ✅ 左ペインの layer 列挙: sensor-bindings を持つ layer のみ列挙。新規追加は MVP 外。
- ✅ Swap inc/dec ボタンを追加（layer ごとの方向反転 UX）。
- ✅ ハードウェア反転は対象外。UI に注記のみ。
- ✅ Consumer code 対応は別タスクに切り出し。

## バリデーション方針

| 項目 | チェック |
|---|---|
| 形式 | `^&inc_dec_kp \S+ \S+$`（trim 後）|
| inc/dec keycode | `&kp X` の Picker で生成可能なトークン（`LS(PSCRN)` 等の nested modifier 込み）|
| source range の現在値 | `&inc_dec_kp X Y` のパターンに一致 |
| 保存後 | 該当 layer の `sensor-bindings` が消えていない・件数が同じ・形式が `&inc_dec_kp X Y` |

## 影響ファイル

### 編集

- `tools/roba-keymap-viewer/src/keymap/parseKeymap.js` — `sensorBindings` 構造化
- `tools/roba-keymap-viewer/src/keymap/pendingChanges.js` — `sensor-binding` kind の builder と validation
- `tools/roba-keymap-viewer/src/keymap/saveBindingChange.js` — `sensor-binding` kind の `validateSourceChange` 分岐 + preserved 検証
- `tools/roba-keymap-viewer/src/App.jsx` — Sensors タブ UI 再構成、`sensorDrafts` state、Picker context 追加、Swap inc/dec ボタン
- `tools/roba-keymap-viewer/src/components/KeycodePicker`（App.jsx 内）— `restrictTo` プロップ追加

### テスト追加

- `parseKeymap.test.js` — sensorBindings の構造化（incKey/decKey/sourceRange/behavior）
- `pendingChanges.test.js` — `sensor-binding` の build / validate / NoOp / 不正形式拒否
- `saveBindingChange.test.js` — sensor-binding の save 成功 / 不正形式拒否 / 件数保存

### 既存テストへの影響

- `parseKeymap.test.js` で `sensorBindings` を `string[]` として扱っている期待値があれば構造化オブジェクトに更新する必要あり。
- `saveBindingChange.js` の `countSensorBindings` は `.length` のみ参照しているのでそのまま動く。

## リスクと懸念

- **`sensorBindings` 形状変更** が `parseKeymap.test.js` の既存スナップショット的テストに影響する可能性がある（実装時に確認）。
- `KeycodePicker` の `restrictTo` プロップを追加するのは小さな変更だが、既存の Picker 利用箇所（Bindings / Combo / Macro）に影響しないよう、デフォルトは「全 Behavior 表示」のまま維持する。
- consumer code（音量・メディア）が `keycodeCatalog.js` に登録されていない場合、ユーザーが期待する用途が一部塞がれる。Task B 完了後に「Consumer code カタログ拡張」を別タスクで対応。

## 実装順序（コミット粒度）

1. **parseKeymap 拡張 + テスト** — まず parser を仕上げ、既存テストの期待値を更新。
2. **pendingChanges + saveBindingChange + テスト** — モデル層を完成。
3. **KeycodePicker `restrictTo` プロップ追加 + テスト**
4. **App.jsx の Sensors タブ UI** — 上記モデルを使って UI 配線、Swap ボタン含む。
5. **手動ブラウザ確認** — `default_layer` と `ARROW` で inc/dec を変更、Swap、Save、Reload、Restore を確認。
6. **commit/push + `docs/current-work-status.md` 更新**。

## 完了条件

- 上記実装すべてが完了し `npm test` / `npm run build` がパス。
- 手動ブラウザで `default_layer` と `ARROW` の sensor-bindings を編集 → Save → 再 Reload で値が保持されることを確認。
- Swap inc/dec ボタンで方向反転が反映される。
- Consumer code 拡張は別タスクとして `docs/current-work-status.md` の「次にやること」に残す。
