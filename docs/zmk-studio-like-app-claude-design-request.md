# Claude Design 依頼文: roBa 用 ZMK Studio 風補助アプリ MVP

作成日: 2026-05-04

この文書は Claude Design に渡す UI モックアップ依頼文。

## 依頼文

roBa という 43 キー split keyboard 用に、ZMK Studio と併用するローカル Web 補助アプリの UI モックアップを作ってください。

これは ZMK Studio の完全代替ではありません。公式 ZMK Studio はキーボード本体への直接反映に使い、この補助アプリは repository の `config/roBa.keymap` を正本として、視覚確認、一覧表示、Markdown / JSON 出力、Windows JIS 表示補助を行います。

初期 MVP は read-only です。編集 UI は Phase 2 以降なので、モックアップ上では編集ボタンを disabled または「後で対応」扱いにしてください。

## 前提

- 対象 keyboard: roBa
- key count: 43
- layers: 7
- layer names:
  - `default_layer`
  - `FUNCTION`
  - `NUM`
  - `ARROW`
  - `MOUSE`
  - `SCROLL`
  - `layer_6`
- layout source: `config/roBa.json`
- keymap source: `config/roBa.keymap`
- 公式 ZMK Studio は直接反映用として併用する
- repo canonical は `config/roBa.keymap`
- Windows JIS 表示を主用途にする

## 作りたい画面

### 1. メイン画面

1 画面で以下を見られる構成にしてください。

- 左: source / layer list
- 中央: roBa のビジュアルキーボード
- 右: selected key detail
- 下: tabs
  - Bindings
  - Combos
  - Macros
  - Behaviors
  - Sensors
  - Markdown

画面は作業ツールとして使うので、マーケティング風の landing page ではなく、最初から実用画面にしてください。

### 2. Markdown 出力画面

Markdown tab または separate preview として、以下を出力する画面を作ってください。

- layer ごとの key binding table
- combos table
- macros summary
- custom behaviors summary
- sensor-bindings table
- warnings

Markdown はコピーできるようにしてください。MVP ではファイル保存まで必須ではありません。

### 3. 状態・警告画面

通常画面の中に組み込む warning UI として以下を表現してください。

- Read-only MVP
- repo canonical: `config/roBa.keymap`
- official ZMK Studio direct changes may differ from repo
- key count mismatch is blocking error
- coordinate mismatch is warning
- unsupported binding is read-only
- File System permission lost

## UI で見せたい情報

### Header / Source area

- loaded files:
  - `config/roBa.keymap`
  - `config/roBa.json`
- mode: Read-only
- canonical source: Repo `.keymap`
- external tools:
  - Open official ZMK Studio
  - Open Keymap Editor

### Visual keyboard

roBa の 43 キー配置を中央に表示してください。

key cap には以下を表示してください。

- display label
- raw behavior short label
- unsupported / custom / transparent の状態

例:

- `Q`, `&kp`
- `SCROLL`, `&mo 5`
- `SPACE`, `&lt 2`
- `INT_HENKAN`, `&lt_to_layer_0 6 INT_HENKAN`
- transparent は薄く表示

### Selected key detail

選択キーの詳細には以下を表示してください。

- layer name
- position index
- display label
- raw binding
- binding kind
- parameters
- editability
- Studio direct possible / build required / source-only
- Windows JIS display note

MVP では編集操作は disabled にしてください。ただし Phase 2 予定として `Capture PC Key` の disabled control を置いてもよいです。

### Bindings table

以下の列を持つ密度高めの table にしてください。

- position
- display
- raw binding
- kind
- editability
- notes

検索欄と layer filter を置いてください。

### Combos tab

以下の列を持つ table にしてください。

- name
- positions
- keys
- binding
- layers
- timeout
- status

中央キーボード上で combo 対象キーをハイライトできる状態を想定してください。

### Macros / Behaviors tab

Macros:

- name
- compatible
- steps summary
- raw definition
- status

Behaviors:

- name
- compatible
- binding cells
- uses
- raw definition
- status

### Sensors tab

以下を表示してください。

- layer
- sensor
- raw binding
- display meaning

roBa の `config/roBa.json` では sensor metadata の `enabled` が false でも、`.keymap` 側の `sensor-bindings` が正なので、UI 上で「エンコーダ無し」と断定しないでください。

## Visual tone

個人用の実用ツールとして、静かで情報密度のある UI にしてください。

- oversized hero は不要
- decorative card だらけにしない
- table と panel を中心にする
- keyboard layout は中央で見やすくする
- cards は repeated item や selected detail 程度に留める
- 色は one-note にしない
- Windows JIS / raw ZMK / Studio state を見分けやすくする

## 重要な制約

- 直接反映は MVP に含めない
- `.keymap` 編集は MVP に含めない
- combo / macro / custom behavior / sensor-bindings 編集は MVP に含めない
- 保存ボタンは出さないか、disabled にする
- 編集 UI がある場合は必ず `Phase 2+` と分かる disabled state にする
- 画面上の説明文は最小限にし、状態表示と table label で伝える

## Keymap Editor 実地確認から分かったこと

Keymap Editor は `config/roBa.keymap` を読み込め、`config/roBa.json` を Custom metadata として渡すと 43 キー配置を表示できました。

ただし以下が不足します。

- roBa は既知 keyboard として自動認識されない
- Markdown 出力がない
- Windows JIS 表示補正がない
- repo canonical / Studio settings divergence の警告がない
- 一覧出力は roBa 専用用途には弱い

したがって、この補助アプリは Keymap Editor を置き換えるのではなく、Keymap Editor / ZMK Studio と並べて使う dashboard / export tool として設計してください。

## 期待する成果物

- Desktop 画面のメインモック
- Narrow width 画面の簡易 responsive モック
- Markdown preview のモック
- warning / error state のモック
- 主要 component 一覧
- MVP に入れる UI と Phase 2 以降に回す UI の切り分け
