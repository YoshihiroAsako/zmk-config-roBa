# Phase 0 調査メモ レビュー依頼文

以下を他 AI に渡して、`docs/zmk-studio-like-app-phase0-research.md` をレビューしてもらう。

```md
# レビュー依頼

あなたには、ZMK キーボード `roBa` 用の「ZMK Studio 風アプリ」計画について、Phase 0 調査メモをレビューしてほしいです。

## 前提

対象リポジトリは `zmk-config-roBa` です。

このリポジトリは ZMK Firmware の設定リポジトリで、roBa split keyboard 用です。

- MCU: `seeeduino_xiao_ble`
- 物理的な roBa_L: 左手側、エンコーダあり
- 物理的な roBa_R: 右手側、PMW3610 トラックボールあり
- roBa_R では ZMK Studio が有効
  - `boards/shields/roBa/roBa_R.conf`
  - `CONFIG_ZMK_STUDIO=y`
  - `CONFIG_ZMK_STUDIO_LOCKING=n`
  - `build.yaml` の roBa_R に `snippet: studio-rpc-usb-uart`
- `config/roBa.keymap` がキーマップの正本
- `config/roBa.json` は Keymap Editor 用メタデータ
- `keymap-drawer/roBa.yaml` / `.svg` は表示用生成物
- 主用途は Windows JIS

ユーザーが作りたいものは、ZMK Studio のような Web もしくはローカルアプリです。

初期要求:

- できれば GitHub を経由しないで直接変更できる
- 指定したキーに、接続している元の PC のキーボードで割り当てたいボタンを押すと、それを設定できる
- ビジュアル的にキーボードのレイアウトが見られる
- 各キーに何が設定されているか一覧表示できる
- 各キーに何が設定されているかを Markdown 形式で出力できる
- 上記以外のおすすめ機能も検討する

現在の計画では、ZMK Studio 互換アプリをフルスクラッチで作るのではなく、以下の方向に寄せています。

- 直接反映は当面、公式 ZMK Studio を併用
- 視覚編集は既存 Keymap Editor をまず評価
- 自作するなら、roBa 専用の補助 Web アプリ
- 補助 Web アプリの主目的は Markdown 出力、一覧表示、Windows JIS 表示、repo 正本運用、差分確認
- roBa の正本は当面 `config/roBa.keymap`

## レビュー対象

主に以下の文書をレビューしてください。

- `docs/zmk-studio-like-app-phase0-research.md`

可能なら、補助的に以下も参照してください。

- `docs/zmk-studio-like-app-plan.md`
- `docs/zmk-studio-like-app-plan-review.md`
- `docs/zmk-studio-like-app-plan-rereview.md`
- `config/roBa.keymap`
- `config/roBa.json`
- `keymap-drawer/roBa.yaml`
- `build.yaml`
- `boards/shields/roBa/roBa_R.conf`

## 特にレビューしてほしい点

### 1. 結論の妥当性

調査メモでは、現時点の結論を以下としています。

- Keymap Editor をまず評価する
- 自作するなら roBa 専用補助 Web アプリから始める
- 直接反映は公式 ZMK Studio 併用
- roBa の正本は `config/roBa.keymap`

この判断は妥当ですか？

過剰に慎重すぎる、または自作範囲を狭めすぎているところはありますか？

### 2. 既存ツール評価の抜け

調査メモでは以下を比較しています。

- Keymap Editor
- ZMK Studio
- keymap-drawer
- roBa 専用自作 Web アプリ

他に見るべき既存ツール、ライブラリ、プロジェクトはありますか？

特に `.keymap` パース、devicetree AST、ZMK Studio RPC、WebHID/WebSerial、Markdown 出力まわりで見落としがあれば指摘してください。

### 3. Keymap Editor の扱い

調査メモでは、Keymap Editor を「まず試す価値が高い」が「fork 前提にはしない」としています。

理由は、GitHub README 上で最近のソース更新が公開されていないとされているためです。

この判断は妥当ですか？

Keymap Editor をそのまま使う、fork する、参考にする、自作する、のどれを優先すべきだと思いますか？

### 4. `.keymap` 編集戦略

roBa の `config/roBa.keymap` には以下が含まれます。

- `&kp`
- `&mt`
- `&lt`
- `&mo`
- custom behavior
- macro
- combo
- sensor-bindings
- nested modifier such as `&kp LS(LG(S))`
- multi-argument behavior such as `&bt BT_SEL 0`

調査メモでは、最初の自作 MVP は read-only とし、編集する場合も 1 キー変更だけ、round-trip 検証必須としています。

この方針は安全ですか？

より良い `.keymap` パース/編集戦略があれば提案してください。

### 5. 物理レイアウト SSoT

調査メモでは、物理レイアウトの単一情報源の第一候補を `config/roBa.json` としています。

理由:

- 43 keys の座標がある
- 回転情報がある
- sensor metadata がある
- Keymap Editor 用メタデータとして自然

一方で、`keymap-drawer/roBa.yaml` は表示ラベル確認用、`.keymap` は binding 正本としています。

この切り分けは妥当ですか？

`config/roBa.json` と `.keymap` / keymap-drawer YAML の不整合をどう扱うべきかも見てください。

### 6. ZMK Studio との関係

調査メモでは、直接反映は当面公式 ZMK Studio に任せ、自作 RPC は MVP から外しています。

また、roBa の正本は `config/roBa.keymap` とし、Studio 側変更は repo `.keymap` とずれるリスクがあるとしています。

この repo canonical 方針は妥当ですか？

ZMK Studio の永続化挙動、Restore Stock Settings、runtime keymap と source keymap の同期について、認識違いがあれば指摘してください。

### 7. MVP 範囲

調査メモでは、推奨 MVP を以下に絞っています。

- Vite + React のローカル Web アプリ
- read-only
- `config/roBa.keymap` / `config/roBa.json` / 必要に応じて `keymap-drawer/roBa.yaml` を入力
- 7 layers / 43 key positions / combos / macros / custom behaviors / sensor-bindings を表示
- Markdown 出力
- JSON 出力
- Windows JIS 表示名
- 公式 ZMK Studio への導線

MVP として狭すぎますか？広すぎますか？

最初に入れるべき機能、後回しにすべき機能を提案してください。

### 8. Claude Design への接続

次の工程として、Claude Design に UI モックアップを作らせる予定です。

調査メモでは、Claude Design に渡すべき情報として以下を挙げています。

- roBa は 43 keys / 7 layers
- 物理配置は `config/roBa.json`
- 最初は read-only
- layer list / visual keyboard / selected key detail / bindings table / combos / macros / behaviors / sensor-bindings / Markdown preview / ZMK Studio link
- repo canonical / Studio direct possible / build required / read-only / Windows JIS display の状態区別

Claude Design に渡す前に、追加すべき UI 要件や制約はありますか？

## 出力形式

以下の形式でレビューしてください。

1. **総評**
   - 方向性が妥当かを短く評価してください。

2. **重大な指摘**
   - 実装前に直すべき設計ミス、見落とし、リスクを優先度順に挙げてください。

3. **採用すべき改善案**
   - Phase 0 調査メモ、計画書、次アクションに反映すべき改善を挙げてください。

4. **保留でよい点**
   - 今すぐ決めなくてよいこと、MVP 後でよいことを挙げてください。

5. **次にやるべきこと**
   - Keymap Editor 実地確認、Claude Design モックアップ依頼、自作 MVP 実装準備のどれを優先すべきか提案してください。

6. **文書への具体的な修正案**
   - 可能なら、`docs/zmk-studio-like-app-phase0-research.md` に追記すべき文言やセクション名を提案してください。

## 注意

- roBa の既存運用では `config/roBa.keymap` が正本です。
- `build.yaml` の roBa_R `snippet: studio-rpc-usb-uart` は消したり移動したりしない前提です。
- roBa_L / roBa_R の物理配置と Kconfig flag の有無を混同しないでください。
- PMW3610 / SPI / ZMK Studio / encoder の side-specific 設定を、対称化すべきとは限りません。
- できるだけ、既存ツールを活かして自作範囲を減らす観点でレビューしてください。
```
