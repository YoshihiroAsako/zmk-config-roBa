# roBa 用 ZMK Studio 風アプリ計画

## 目的

roBa のキーマップを、GitHub Actions や手動ビルドに頼りすぎず、視覚的に確認・編集・出力できる個人用アプリを作る。

最終的には「ローカルの `.keymap` 管理」と「ZMK Studio による直接変更」を破綻なく併用できる状態を目指す。ただし、ZMK Studio 側の変更とリポジトリ内 `.keymap` はずれやすいため、当面は **`config/roBa.keymap` を正本**として扱う。

この計画は、配布用の汎用アプリではなく、Windows + PowerShell + Chromium 系ブラウザを主環境とした roBa 専用ツールを想定する。

## 要求仕様

ユーザーから出た初期要求は以下。

- できれば GitHub を経由しないで直接変更できる
- 指定したキーに、接続している元の PC のキーボードで割り当てたいボタンを押すと、それを設定できる
- ビジュアル的にキーボードのレイアウトが見られる
- 各キーに何が設定されているか一覧表示できる
- 各キーに何が設定されているかを Markdown 形式で出力できる
- 上記以外のおすすめ機能も検討する

## 重要な前提

ZMK Studio は、対応ファームウェア上でランタイムにキーマップを変更できる仕組みである。

ただし、すべての ZMK 設定を自由に変更できるわけではない。新しい behavior 定義、物理レイアウト定義、レイヤー数追加、複雑な macro / combo / tap dance の新規定義などは制約がある。

また、ZMK Studio でキーマップ管理を始めると、リポジトリ内 `.keymap` の変更がそのまま適用されない場合がある。したがって、この計画では次の方針を取る。

- roBa の長期的な正本は `config/roBa.keymap`
- ZMK Studio は直接変更・試用・確認に使う
- 自作アプリで直接反映を扱う場合も、原則として `.keymap` 側に同じ変更を残す
- 直接反映と `.keymap` のずれは UI 上で明示する

参考:

- ZMK Studio: https://zmk.dev/docs/features/studio
- ZMK keymaps: https://zmk.dev/docs/keymaps
- ZMK layout configuration: https://zmk.dev/docs/config/layout
- Keymap Editor: https://github.com/nickcoutsos/keymap-editor

## 推奨する実装方針

レビュー結果を踏まえ、初期方針を **Electron + React** から **Vite + React のローカル Web アプリ優先**へ変更する。

理由:

- 個人利用で配布しないため、Electron のパッケージング利点が小さい
- Chromium 系ブラウザなら File System Access API でローカル `.keymap` の読み書きが可能
- Keymap Editor も Web アプリとしてローカル `.keymap` 操作をサポートしている
- Phase 1-2 の表示・Markdown 出力・限定編集までは Web だけで足りる可能性が高い
- デバイス通信が必要になった段階で Electron / Tauri / Node CLI を検討すればよい

候補:

- **Vite + React**
  - Phase 1-2 の第一候補
  - ローカル起動が軽い
  - UI モックアップから実装へ移しやすい
- **既存 Keymap Editor の利用または参考**
  - `.keymap` パース、視覚編集、File System Access API、combo / macro / encoder 対応など既に多くの機能がある
  - ただし、公開 GitHub リポジトリは最近のソース更新が公開されていないため、fork 前提にはしすぎない
- **Electron / Tauri**
  - Web だけではデバイス通信やローカルコマンド実行が足りない場合の後続候補
- **公式 ZMK Studio**
  - 直接反映は当面こちらを併用する
  - 自作 RPC は MVP に含めない

## Phase 0: 既存ツール調査と設計判断

目的は、自作範囲を最小化し、既存ツールで満たせる部分と roBa 専用に作るべき部分を切り分けること。

### 調査対象

- Nick Coutsos Keymap Editor
- 公式 ZMK Studio Web / Native クライアント
- keymap-drawer
- roBa 既存メタデータ
  - `config/roBa.keymap`
  - `config/roBa.json`
  - `keymap-drawer/roBa.yaml`
  - `keymap-drawer/roBa.svg`
  - `boards/shields/roBa/*.overlay`
  - `boards/shields/roBa/*.conf`

### 確認すること

- GitHub なしで使えるか
- ローカル `.keymap` を読み書きできるか
- roBa の物理レイアウトをそのまま表示できるか
- Windows JIS 補正を取り込めるか
- Markdown 出力を追加できるか
- combo / macro / custom behavior / sensor-bindings を表示できるか
- ZMK Studio 直接反映と組み合わせる意味があるか
- Keymap Editor をそのまま使うか、公開済み旧ソースを fork するか、自作するか

### 成果物

- 既存ツール比較メモ
- fork / 併用 / 自作の判断
- roBa キーマップ構造メモ
- `.keymap` 編集戦略
- 物理レイアウトの単一情報源候補
- MVP の実装範囲

## Phase 0.5: Claude Design によるデザインモックアップ

Phase 0 の調査で、扱うデータ・画面に必要な情報・既存ツールとの差分が見えた段階で、Claude Design を使って UI モックアップを作る。

目的:

- 実装前に画面構成と操作フローを固める
- roBa の物理レイアウト表示が使いやすいか確認する
- 一覧表示、キー編集、Markdown 出力、直接反映可否表示を 1 つの作業画面に無理なく収められるか検証する
- 実装時の CSS / component 構成の迷いを減らす

作るモックアップ:

- メイン画面
  - 左: レイヤー一覧
  - 中央: roBa ビジュアルレイアウト
  - 右: 選択キーの詳細と割り当て操作
  - 下: key bindings / combos / macros / sensor-bindings の一覧
- Markdown 出力プレビュー画面
- 変更差分確認画面
- 「直接反映可能」「ビルド必要」「公式 ZMK Studio で変更」などの状態表示
- Windows JIS / US / Mac 表示切替の UI 案

成果物:

- デザインモックアップ画像または HTML / Figma 相当の画面案
- 画面ごとの主要コンポーネント一覧
- MVP に入れる UI と後回しにする UI の切り分け
- 実装時に使う表示ラベル、状態名、操作ボタン名の候補

注意:

- モックアップは実装の前提にするが、見た目だけで仕様を増やしすぎない
- MVP では「美しいが複雑な画面」より、キー確認・編集・出力が迷わずできる画面を優先する
- ZMK Studio 直接反映 UI は、最初は公式 ZMK Studio 併用の導線として扱う

## `.keymap` 編集戦略

ZMK の `.keymap` は devicetree 構文であり、C プリプロセッサ、`#include`、マクロ、custom behavior、combo、macro などが混在する。

roBa の `config/roBa.keymap` にも以下が存在する。

- `&mt LEFT_SHIFT Z`
- `&lt 2 SPACE`
- `&lt_to_layer_0 6 INT_HENKAN`
- `&kp LS(LG(S))`
- `&bt BT_SEL 0`
- combo
- macro
- custom behavior
- sensor-bindings

そのため、単純な文字列置換で編集するのは危険。

候補:

- 既存 Keymap Editor をそのまま使う
- 公開済み Keymap Editor ソースを参考にする
- tree-sitter + devicetree grammar を使う
- roBa 専用の限定パーサを作る
- keymap-drawer YAML を表示用と割り切り、`.keymap` は別に解析する

MVP 前の必須ゲート:

- 編集なしの parse -> serialize で差分が出ない
- 1 キー変更で変更箇所以外に差分が出ない
- combo / macro / behavior / sensor-bindings を消さない
- 保存前に Git diff 相当の差分を表示する

最初の編集範囲:

- `bindings` ブロック内の 1 キー変更のみ
- `&kp` の基本キーから始める
- `&mt` / `&lt` / custom behavior / combo / macro 編集は表示だけ先に対応し、編集は後回し

## 物理レイアウトの単一情報源

候補:

- `config/roBa.json`
  - keymap-editor 用メタデータ
  - 座標と sensor 情報を持つ
  - アプリの物理配置 SSoT 第一候補
- `keymap-drawer/roBa.yaml`
  - 表示ラベルや keymap-drawer 出力に近い
  - 生成物と手動調整が混在する可能性がある
- ZMK physical-layout DTS
  - ZMK Studio との整合には重要
  - 現在の roBa 側定義を確認する必要がある

現時点の推奨:

- 物理配置は `config/roBa.json` を第一候補にする
- 表示ラベルは `config/roBa.keymap` の解析結果から生成する
- `keymap-drawer/roBa.yaml` は比較・Markdown/SVG 表示確認用に参照する

## データモデル案

`params: string[]` だけでは、layer 番号、keycode、modifier、behavior 引数の型情報が落ちる。MVP でも binding 種別を持つ。

```ts
type BindingKind =
  | "kp"
  | "mt"
  | "lt"
  | "mo"
  | "to"
  | "bt"
  | "mkp"
  | "trans"
  | "none"
  | "macro"
  | "custom"
  | "unknown";

type BindingParam =
  | { kind: "keycode"; value: string; display?: string }
  | { kind: "modifier"; value: string }
  | { kind: "layer"; value: number; label?: string }
  | { kind: "number"; value: number }
  | { kind: "behavior-ref"; value: string }
  | { kind: "raw"; value: string };

type KeyBinding = {
  layerId: number;
  layerName: string;
  position: number;
  rawBinding: string;
  displayLabel: string;
  bindingKind: BindingKind;
  behavior: string;
  params: BindingParam[];
  sourceRange?: {
    start: number;
    end: number;
  };
  editability: "direct" | "source-only" | "read-only" | "unknown";
};

type PhysicalKey = {
  position: number;
  row?: number;
  col?: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  rotationOriginX?: number;
  rotationOriginY?: number;
  side?: "left" | "right";
};

type KeymapDocument = {
  sourcePath: string;
  physicalLayoutSource: "roBa.json" | "keymap-drawer" | "zmk-physical-layout" | "manual";
  layers: {
    id: number;
    name: string;
    bindings: KeyBinding[];
    sensorBindings?: string[];
  }[];
  combos: {
    name: string;
    positions: number[];
    binding: KeyBinding;
  }[];
  macros: {
    name: string;
    rawDefinition: string;
  }[];
  customBehaviors: {
    name: string;
    compatible: string;
    rawDefinition: string;
  }[];
  physicalLayout: PhysicalKey[];
};
```

## Phase 1: 読み取り・表示・出力 MVP

この段階ではキーボード本体への直接変更は行わない。

機能:

- `config/roBa.keymap` を読み込む
- `config/roBa.json` から物理レイアウトを読み込む
- レイヤー一覧を表示する
- roBa のビジュアルレイアウトを表示する
- レイヤーごとの key bindings を一覧表示する
- combo 一覧を表示する
- macro / custom behavior 一覧を表示する
- sensor-bindings 一覧を表示する
- Markdown 形式でエクスポートする
- JSON 形式でもエクスポートできるようにする

Markdown 出力例:

```md
# roBa Keymap

## Layer 0: default_layer

| Position | Display | Binding | Kind | Notes |
| --- | --- | --- | --- | --- |
| 0 | Q | &kp Q | kp | |
| 36 | SCROLL | &mo 5 | mo | activates SCROLL layer |

## Sensor Bindings

| Layer | Binding |
| --- | --- |
| default_layer | &inc_dec_kp PG_UP PAGE_DOWN |

## Combos

| Name | Positions | Binding |
| --- | --- | --- |
| double_quotation | 18 + 19 | &kp AT_SIGN |
```

この段階で得られる価値:

- 現在のキーマップを読みやすく確認できる
- Markdown でレビュー・共有できる
- Claude Design モックアップを実装へ移せる
- 後続の編集機能の土台になる

## Phase 2: ローカル限定編集

この段階では `.keymap` をアプリから限定的に編集できるようにする。

機能:

- 画面上のキーをクリックして選択する
- PC の物理キーボードでキーを押すと、選択中の roBa キーへ割り当てる
- まずは `&kp A`、`&kp ENTER`、`&kp TAB` など基本的な key press から対応する
- Windows JIS 向けの表示と ZMK keycode の変換を持たせる
- 変更差分を表示する
- `config/roBa.keymap` に保存する
- 編集前自動バックアップを作る

後回しにする編集:

- combo 編集
- macro 編集
- custom behavior 新規作成
- hold-tap / layer-tap の詳細編集
- sensor-bindings 編集

品質ゲート:

- 編集なし保存で差分が出ない
- 1 キー変更で変更箇所以外に差分が出ない
- `npx` / `npm test` など、ローカルで round-trip テストを実行できる

## Phase 3: keymap-drawer 連携

表示レイアウトが変わる変更では、既存ワークフローに合わせて keymap-drawer も更新する。

機能:

- keymap-drawer のローカル導入状況を確認する
- `keymap-drawer/roBa.yaml` の手動調整有無を警告する
- `keymap parse` / `keymap draw` を実行できる場合はアプリから案内する
- 実行後に差分を表示する

PowerShell 例:

```powershell
keymap parse -c 10 -z config/roBa.keymap | Out-File -Encoding utf8 keymap-drawer/roBa.yaml
keymap draw keymap-drawer/roBa.yaml | Out-File -Encoding utf8 keymap-drawer/roBa.svg
```

注意:

- ローカル環境に `keymap` コマンドがない場合がある
- コマンド未導入時は、アプリ内表示と Markdown 出力だけ継続できるようにする

## Phase 4: 公式 ZMK Studio 併用

直接反映は、当面は自作せず公式 ZMK Studio を併用する。

理由:

- roBa_R は ZMK Studio 有効化済み
- 公式 ZMK Studio は USB 接続中の変更に対応している
- 自作 RPC は調査コストが高い
- runtime keymap と repository keymap の同期問題がある

Phase 4A:

- アプリ内に公式 ZMK Studio への導線を置く
- 「この変更は公式 ZMK Studio でも可能」「この変更は `.keymap` 編集 + ビルドが必要」を表示する

Phase 4B:

- 公式 Studio で変更した内容を repo `.keymap` へ転記する支援を検討する
- runtime 側と repo 側のずれを検出できるか調査する

Phase 4C:

- 必要になった場合のみ Web Serial / Web HID / Studio RPC の自作を調査する
- 自作する場合も、`.keymap` へ同時反映する設計を優先する

## Phase 5: 高度な編集

基本編集が安定してから追加する。

候補:

- combo 編集
- macro 編集
- hold-tap / mod-morph / layer-tap の専用 UI
- encoder / sensor binding 編集
- レイヤー名変更
- 予約レイヤーの有効化
- Windows JIS / US / Mac 表示切替
- keymap-editor とのインポート / エクスポート

## おすすめ追加機能

優先度高:

- 変更前後の差分表示
- 自動バックアップ
- `.keymap` round-trip 検証
- 「直接反映可能」「ビルド必要」「公式 Studio 推奨」の分類表示
- キー名検索
- 未設定キー / transparent / none の一覧
- Windows JIS 補正表を内蔵した入力補助

優先度中:

- combo の衝突チェック
- 同じキー割り当ての検索
- Markdown 出力テンプレート選択
- JSON エクスポート
- keymap-drawer SVG プレビュー
- Git diff プレビュー

優先度低:

- 複数キーボード対応
- 汎用 ZMK keymap editor 化
- クラウド同期
- 共有 URL 生成

## 改訂後の最初の MVP

最初の MVP は以下にする。

- roBa 専用
- Vite + React のローカル Web アプリ
- Claude Design で作ったモックアップを元に画面構成を決める
- File System Access API で `config/roBa.keymap` を読み込む
- `config/roBa.json` から roBa レイアウトを表示する
- レイヤー切替
- key bindings 一覧表示
- combo / macro / custom behavior / sensor-bindings 一覧表示
- Markdown エクスポート
- JSON エクスポート
- 最初は read-only
- 次に 1 キー変更だけ対応する
- 1 キー変更でも round-trip 検証を必須にする
- 直接反映は MVP には含めず、公式 ZMK Studio への導線だけ用意する

## レビューしてほしい論点

次のレビューでは、特に以下を確認したい。

- 既存 Keymap Editor をそのまま使う / 補助ツールを作る / 自作する、のどれが現実的か
- Phase 1-2 を Vite + React の Web アプリにする判断は妥当か
- `.keymap` パーサを自作するか、Keymap Editor / tree-sitter / keymap-drawer の知見を流用するか
- `config/roBa.json` を物理レイアウト SSoT 第一候補にしてよいか
- runtime keymap と `.keymap` の同期は repo canonical 方針でよいか
- Claude Design のモックアップ作成タイミングは Phase 0 後でよいか
- Phase 4 を公式 ZMK Studio 併用に格下げする判断は妥当か

## 現時点の結論

まずは **既存ツール調査**を行い、Keymap Editor / ZMK Studio / roBa 既存メタデータでどこまで要求を満たせるか確認する。

その後、Claude Design で UI モックアップを作り、MVP に必要な画面だけを固める。

実装する場合は、Electron ではなく **Vite + React のローカル Web アプリ**から始める。最初は read-only の表示・一覧・Markdown 出力までに絞り、`.keymap` 編集は round-trip 検証が通ってから 1 キー変更だけ対応する。

直接反映は自作せず、当面は公式 ZMK Studio を併用する。roBa の正本は引き続き `config/roBa.keymap` とする。
