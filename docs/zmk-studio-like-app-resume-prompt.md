# 新しいチャット再開用プロンプト

以下を新しいチャットの最初に貼る。

```md
このリポジトリ `zmk-config-roBa` で、roBa 用 ZMK Studio 風補助アプリ計画の続きを進めてください。

必ず日本語で回答してください。

## 最初に読むもの

まず以下を読んで、現在の進捗と方針を把握してください。

1. `AGENTS.md`
2. `docs/current-work-status.md`
3. `docs/zmk-studio-like-app-plan.md`
4. `docs/zmk-studio-like-app-phase0-research.md`
5. `docs/zmk-studio-like-app-phase0-rereview.md`
6. `docs/zmk-studio-like-app-advanced-editing-ux-notes.md`

必要に応じて以下も参照してください。

- `docs/zmk-studio-like-app-plan-review.md`
- `docs/zmk-studio-like-app-plan-rereview.md`
- `docs/zmk-studio-like-app-phase0-review-request.md`
- `docs/zmk-studio-like-app-phase0-rereview-request.md`
- `config/roBa.keymap`
- `config/roBa.json`
- `keymap-drawer/roBa.yaml`
- `boards/shields/roBa/roBa.dtsi`
- `boards/shields/roBa/roBa_R.conf`
- `build.yaml`

## 現在の結論

今作ろうとしているものは、ZMK Studio の完全代替ではなく、ZMK Studio と併用する roBa 専用補助アプリです。

役割分担:

- 公式 ZMK Studio:
  - キーボード本体への直接反映
  - USB 接続を基本とする
  - BLE 経由は環境依存で、Windows では当面前提にしない
- roBa 専用補助アプリ:
  - `config/roBa.keymap` を正本として管理する
  - 視覚表示
  - 各キー / combo / macro / custom behavior / sensor-bindings の一覧
  - Markdown / JSON 出力
  - Windows JIS 表示補助
  - 将来的な `.keymap` 直接編集

roBa の正本は当面 `config/roBa.keymap` です。Studio 側の runtime/settings 状態と repo `.keymap` はずれる可能性があるため、repo canonical 方針を維持します。

## 次にやること

次の優先作業は **Keymap Editor を roBa の `config/roBa.keymap` / `config/roBa.json` で実際に試すこと** です。

確認したいこと:

- `config/roBa.keymap` を読み込めるか
- `config/roBa.json` の layout が自動適用されるか
- `default_layer` / `FUNCTION` など layer 名が期待どおり出るか
- custom behavior `lt_to_layer_0` を表示できるか
- `sensor-bindings` を表示または保持できるか
- 保存したときに不要な差分が出ないか
- GitHub なしの File System / Clipboard 経路で運用できるか
- Markdown 出力相当があるか、ないか

Keymap Editor 実地確認ができない環境なら、代わりに **Claude Design に渡す UI モックアップ依頼文** を作成してください。

## 重要な設計方針

- 初期 MVP は Vite + React のローカル Web アプリ候補
- 最初は read-only
- 入力は `config/roBa.keymap`、`config/roBa.json`、必要に応じて `keymap-drawer/roBa.yaml`
- 出力は Markdown / JSON
- 直接反映は MVP に含めず、公式 ZMK Studio への導線だけ用意する
- `.keymap` 編集は Phase 2 以降
- combo / macro / custom behavior / sensor-bindings 編集は Phase 5 以降
- PC キーを押して roBa キーに割り当てる機能は Phase 2
- combo / macro UI/UX の方向性は `docs/zmk-studio-like-app-advanced-editing-ux-notes.md` を参照

## .keymap 編集の方針

`.keymap` は壊しやすいので、編集は慎重に扱います。

- AST 再生成ではなく、元ファイルバッファに対する `sourceRange` slice 置換を基本とする
- 置換単位は token ではなく binding expression 全体
- 編集なし保存で差分なし
- 1 キー変更で変更箇所以外のコメント、空行、インデント、BOM、改行コードを保持
- combo / macro / custom behavior / sensor-bindings を消さない
- 保存前に Git diff 相当を表示

## Studio / settings の注意

- roBa_R は `CONFIG_ZMK_STUDIO=y`
- roBa_R は `CONFIG_ZMK_STUDIO_LOCKING=n`
- `build.yaml` の roBa_R には `snippet: studio-rpc-usb-uart`
- `build.yaml` の `settings_reset` matrix は崩さない
- Studio 変更は settings 側に残る可能性がある
- repo `.keymap` を正として戻す場合は、まず ZMK Studio の Restore Stock Settings を優先
- `settings_reset` firmware は Studio にアクセスできない場合や settings 全体を初期化したい場合の手段

## 物理レイアウト

- `boards/shields/roBa/roBa.dtsi` に `roba_physical_layout` が存在する
- ZMK Studio は DTS physical layout を使う
- 補助アプリは `config/roBa.json` を物理配置 SSoT 第一候補にする
- DTS と `config/roBa.json` の座標は完全一致していない
- MVP では座標完全一致を必須にしない
- key count / position count 不一致は blocking error
- 座標差は warning

## 作業後に必ず行うこと

- 進捗を `docs/current-work-status.md` に追記してください
- 新しい判断や調査結果が出たら、関連する `docs/zmk-studio-like-app-*.md` に残してください
- キーマップを変更する場合は `config/roBa.keymap`、`keymap-drawer/roBa.yaml`、`keymap-drawer/roBa.svg` の扱いに注意してください
- `build.yaml`、`west.yml`、`.dtsi`、`.overlay` は理由なく変更しないでください
```
