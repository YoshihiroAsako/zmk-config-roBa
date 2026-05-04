# roBa 用アプリ 高度編集 UI/UX メモ

作成日: 2026-05-04

対象:

- roBa 用 ZMK Studio 風補助アプリ
- Phase 5 以降の combo / macro / custom behavior / sensor-bindings 編集

## 位置付け

この文書は確定仕様ではなく、今後 Claude Design でモックアップを作るとき、または高度編集を設計するときの参照メモ。

現時点の MVP は read-only の表示・一覧・Markdown / JSON 出力を優先する。直接 `.keymap` を書き換える編集機能は、round-trip 検証と 1 キー編集が安定してから段階的に追加する。

## 基本方針

- ZMK Studio の代替ではなく、repo canonical な `.keymap` 管理補助として設計する
- 画面上では簡単に見えても、保存前には必ず `.keymap` diff を表示する
- 変更前バックアップを自動作成する
- 未対応構文は無理に編集させず read-only 表示にする
- 「ZMK Studio で直接反映可能」「`.keymap` 編集 + ビルド必要」を常に区別する
- combo / macro / behavior は最初から新規作成まで入れず、表示 → 既存編集 → 新規作成の順に進める

## 画面レイアウト案

高度編集でも基本レイアウトは Phase 1 と同じにする。

- 左: レイヤー一覧
- 中央: roBa ビジュアルキーボード
- 右: 選択対象の詳細編集パネル
- 下: 一覧テーブル / Markdown preview / `.keymap` diff

タブ案:

- Keys
- Combos
- Macros
- Behaviors
- Sensors
- Diff

## combo 編集 UX 案

### 一覧表示

Combos タブで以下を表示する。

| 項目 | 内容 |
| --- | --- |
| name | combo node name |
| positions | key-positions |
| keys | positions に対応する表示ラベル |
| binding | `&kp TAB` など |
| layers | layers 条件があれば表示 |
| timeout | timeout-ms があれば表示 |
| status | editable / read-only / unsupported |

### 既存 combo 編集

操作フロー:

1. Combos タブで combo を選択
2. 中央のキーボード上で combo 対象キーをハイライト
3. キーをクリックして positions を追加/削除
4. 右パネルで output binding を編集
5. timeout / layers など任意項目を編集
6. 衝突チェックを確認
7. `.keymap` diff を確認して保存

### 新規 combo 作成

Phase 5 以降で検討。

操作フロー案:

1. `New Combo` を押す
2. キーボード上で 2 個以上のキーを選択
3. combo name を入力
4. output binding を設定
5. 必要なら layer 条件を選ぶ
6. 衝突チェックを通す
7. `.keymap` preview / diff を確認
8. 保存

### 衝突チェック

最低限チェックすること:

- 同じ positions の combo が既にないか
- positions の一部が既存 combo と強く重なっていないか
- timeout が短すぎ/長すぎないか
- layers 条件なし combo が広すぎないか
- combo の output binding が未対応構文でないか

## macro 編集 UX 案

### 一覧表示

Macros タブで以下を表示する。

| 項目 | 内容 |
| --- | --- |
| name | macro node name |
| compatible | `zmk,behavior-macro` など |
| binding-cells | `#binding-cells` |
| steps | macro の概略 |
| status | editable / read-only / unsupported |

### ステップリスト編集

`.keymap` 構文を直接書かせず、時系列のステップとして表示する。

ステップ例:

- tap key
- press key
- release key
- wait
- parameter placeholder
- raw binding

UI 表示例:

| # | Action | Value |
| --- | --- | --- |
| 1 | tap | `LCTRL` |
| 2 | tap | `C` |
| 3 | wait | `30ms` |
| 4 | tap | `ENTER` |

### 既存 macro 編集

操作フロー:

1. Macros タブで macro を選択
2. 右パネルでステップリストを表示
3. ステップを追加/削除/並び替え
4. 各ステップの keycode や wait time を編集
5. `.keymap` preview を確認
6. diff を確認して保存

### 新規 macro 作成

Phase 5 以降で検討。

操作フロー案:

1. `New Macro` を押す
2. macro name を入力
3. step を追加
4. keycode / wait / press / release を設定
5. optional に `#binding-cells` を設定
6. `.keymap` preview / diff を確認
7. 保存

### macro 編集の注意

- `zmk,behavior-macro-one-param` など parameter macro は難度が高いので最初は read-only
- `&macro_param_1to1` のような placeholder は専用表示にする
- 未対応 macro は raw view + read-only
- macro の新規作成は、既存 macro の安全な表示と編集が安定してから

## custom behavior 編集 UX 案

roBa には `lt_to_layer_0` のような custom behavior がある。

最初は以下に留める。

- 一覧表示
- compatible 表示
- `#binding-cells` 表示
- raw definition 表示
- 参照元 key positions の表示

編集は後回し。

理由:

- hold-tap / mod-morph / custom macro などで schema が異なる
- behavior 定義を壊すとビルド不能になる
- UI で安全に抽象化するには schema ごとの設計が必要

## sensor-bindings 編集 UX 案

roBa では `default_layer` と `ARROW` に `sensor-bindings` がある。

一覧表示:

| Layer | Sensor Binding | Meaning |
| --- | --- | --- |
| default_layer | `&inc_dec_kp PG_UP PAGE_DOWN` | encoder up/down |
| ARROW | `&inc_dec_kp LC(PAGE_UP) LC(PAGE_DOWN)` | encoder up/down with Ctrl |

編集案:

- layer ごとに sensor binding を表示
- left / right encoder metadata は `config/roBa.json` から表示
- 実際の behavior は `.keymap` の `sensor-bindings` を正とする
- `config/roBa.json` の `enabled: false` は「エンコーダ無し」とは判断しない

編集は Phase 5 以降。

## PC キー入力による割り当て UX

Phase 2 の 1 キー編集で復帰させる。

基本フロー:

1. キーボード上の key position を選択
2. 右パネルで `Capture PC Key` を有効化
3. PC の物理キーボードで割り当てたいキーを押す
4. アプリが host input と ZMK binding 候補を表示
5. Windows JIS 表示名と raw ZMK binding を両方表示
6. ユーザーが確認して適用
7. `.keymap` diff を確認して保存

表示例:

- Host input: `Shift + 2`
- Display (Windows JIS): `"`
- ZMK binding candidate: `&kp AT_SIGN`
- Apply method: `.keymap edit, build required`

注意:

- PC が検出したキーと ZMK keycode は一致しないことがある
- Windows JIS 補正表を必ず介す
- 直接適用ではなく、候補表示 → 確認 → diff の順にする

## 保存 UX

保存前に必ず以下を表示する。

- 変更対象
- `.keymap` preview
- Git diff 相当の差分
- 直接反映可否
- ビルド必要か
- Studio 側 settings とずれる可能性

保存時:

- 自動バックアップを作成
- BOM / 改行コードを保持
- sourceRange 置換で対象 binding expression だけ変更
- 保存後に count 検証を実行

## 今後 Claude Design に渡すとよい観点

高度編集モックアップを依頼するときは、以下を渡す。

- combo 作成フロー
- macro ステップリスト編集
- unsupported / read-only 状態
- diff preview
- Windows JIS 表示と raw ZMK binding の併記
- ZMK Studio direct possible / build required badge
- 保存前確認 modal

## 現時点の判断

combo / macro / custom behavior / sensor-bindings 編集は、最初から実装しない。

ただし、UI/UX の方向性としては、`.keymap` 構文を直接触らせるのではなく、ビジュアルキーボード、ステップリスト、一覧テーブル、diff preview を組み合わせる。

最重要は「便利に見せる」より「壊さずに保存できる」こと。
