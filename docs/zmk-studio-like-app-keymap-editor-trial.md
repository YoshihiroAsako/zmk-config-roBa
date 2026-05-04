# Keymap Editor 実地確認メモ

確認日: 2026-05-04

対象:

- Keymap Editor: https://nickcoutsos.github.io/keymap-editor/
- `config/roBa.keymap`
- `config/roBa.json`

## 確認方法

Edge + Playwright の一時実行で Keymap Editor を開き、File System 入力経路を確認した。

この環境では `agent-browser` コマンドが未導入だったため、`%TEMP%` 側に一時的に Playwright を入れて確認した。リポジトリには依存関係を追加していない。

File System Access API のファイル選択は headless 自動操作と相性が悪かったため、実ファイルを書き換えないようにブラウザ内で最小限の file handle / writable をモックした。実際の確認では `roBa.keymap` を import し、keyboard metadata として `config/roBa.json` を Custom metadata から渡した。

## 結論

Keymap Editor は roBa の `config/roBa.keymap` を読み込める。`config/roBa.json` も Custom metadata として渡せば、43 キーの物理配置に反映できる。

ただし、roBa は Keymap Editor の既知 keyboard 一覧には入っていないため、完全自動認識はしない。File System import で `roBa.keymap` と `roBa.json` を同時に選ぶだけでは、`roBa.json` も keymap file 候補として扱われ、`roBa.keymap` へ自動対応付けされなかった。

運用するなら、現状は以下の手順が必要。

1. File System source を選ぶ。
2. `config/roBa.keymap` を import する。
3. `Identify keyboard` で `Custom...` を選ぶ。
4. Custom metadata の File に `config/roBa.json` を指定する。
5. import 後、上部の keymap select で `roBa.keymap` を選ぶ。

## 確認結果

| 確認項目 | 結果 | メモ |
| --- | --- | --- |
| `config/roBa.keymap` を読み込めるか | OK | File System source + Custom metadata で編集画面まで到達した |
| `config/roBa.json` の layout が適用されるか | OK | 43 個の key button が表示され、左右分割・親指周辺の配置も `roBa.json` 由来の形になった |
| layer 名が期待どおり出るか | OK | `default_layer` / `FUNCTION` / `NUM` / `ARROW` / `MOUSE` / `SCROLL` / `layer_6` を確認 |
| custom behavior `lt_to_layer_0` を表示できるか | OK | key button と Behaviors tab の両方で表示された |
| combo を表示できるか | OK | `tab` / `shift_tab` / `muhennkann` / `double_quotation` / `eq` を確認 |
| macro を表示できるか | OK | `to_layer_0` を Parameterized Macro として表示した |
| `sensor-bindings` を表示できるか | OK | `default_layer` と `ARROW` で sensor bindings 表示を確認 |
| 保存したときに不要な差分が出ないか | 一部確認 | key を開いて変更せず Apply した場合、モック writable への書き込みは発生しなかった。実編集時の serialize 差分は未確認 |
| GitHub なしの File System 経路 | OK | ただし roBa は Custom metadata 指定が必要 |
| Clipboard 経路 | 画面確認のみ | Clipboard source は存在し、keymap text 入力 UI もある。roBa metadata 付きの実ロードは未確認 |
| Markdown 出力相当 | 見当たらない | 画面上に Markdown export / preview 相当は確認できなかった |

## 観察した表示

Layer view:

- 43 key positions を表示した。
- `&kp` / `&mt` / `&lt` / `&mo` / `&lt_to_layer_0` / `&trans` などを視覚表示した。
- `sensor-bindings` は layer 下部に表示された。
- `default_layer` の encoder left は `PG_UP` / `PG_DN`、`ARROW` の encoder left は `^PG_UP` / `^PG_DN` として見えた。

Combos tab:

- combo 名と output binding は見える。
- combo position の一覧性や Markdown 向け表形式は弱い。

Macros tab:

- `&to_layer_0` は表示できた。
- `&macro_param_1to1` と placeholder を含む形で表示された。

Behaviors tab:

- `&lt_to_layer_0` は custom behavior として表示された。
- `&mt` reconfiguration も表示された。

## 注意点

Keymap Editor は既存編集ツールとして十分使えるが、roBa 専用補助アプリを不要にするほどではない。

理由:

- roBa を既知 keyboard として自動認識しない。
- `roBa.json` は Custom metadata として手動指定が必要。
- Windows JIS 向けの表示補正は期待しすぎない方がよい。
- `INT_HENKAN` / `INT_MUHENKAN` は `INT4` / `INT5` のように表示された。
- `BACKSPACE` / `DEL` など一部 key label は innerText 上では空に見え、Markdown 出力用の正規化には向かない。
- Markdown 出力、repo canonical 運用警告、ZMK Studio settings との差分警告は別途必要。
- 実編集時の出力差分はまだ確認できていないため、`.keymap` 正本を壊さない保存戦略は自作側で引き続き必要。

## 判断

Keymap Editor は roBa の視覚編集ツールとして併用価値がある。

一方で、自作する roBa 専用補助アプリの MVP は引き続き有効。特に以下は Keymap Editor とは別に作る価値が高い。

- repo canonical な `config/roBa.keymap` の読み取り表示
- key / combo / macro / behavior / sensor-bindings の一覧
- Markdown / JSON 出力
- Windows JIS 表示補助
- Keymap Editor / ZMK Studio への導線
- 保存前 diff と sourceRange 置換方針に基づく将来編集

## 次のアクション

1. Claude Design に渡す UI モックアップ依頼文を作る。
2. read-only MVP の画面で Keymap Editor との差分を明示する。
3. 実装前に `.keymap` read-only parser の検証基準を固める。
4. 編集機能に入る前に、Keymap Editor の実編集時 serialize 差分を別途確認する。
