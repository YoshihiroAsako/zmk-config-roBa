# zmk-studio-like app Post-Phase 2: Key Capture Input Plan

## 位置づけ

この計画は、Phase 2 の既存編集フロー（draft / pending changes / preview / save all）を維持したまま、Binding 入力体験を改善する Post-Phase 2 追加機能として扱う。

## 背景

- 現状の Binding 編集は raw text 入力（例: `&kp A`）が中心。
- 入力ミスや編集速度の観点から、選択キーに対して PC キー押下で自動入力できると運用しやすい。

## 目的

- 選択中キーの Binding draft に対し、PC キーボード入力から `&kp KEYCODE` を生成して反映する。
- 既存の source-range 置換・validation・save ガードを再利用し、保存系の安全性を崩さない。

## スコープ（MVP / Post-Phase 2-A）

- 対象タブ: Bindings（通常キー編集）
- 対象式: `&kp` のみ
- 操作:
  - Capture ON/OFF トグル
  - ON 中の `keydown` で `&kp ...` を draft へ反映
  - `Esc` で Capture キャンセル
- 入力方式:
  - MVP は key capture のみ
  - リスト選択 UI は後続フェーズで扱う
- 既存フロー連携:
  - Add/Update draft
  - Preview（Context Diff / `.keymap` Preview）
  - Save all

## 非スコープ（MVPでは実施しない）

- `&mo` / `&lt` / `&mt` の自動生成
- Combo/Macro への同等機能展開
- 同時押し・修飾キー合成からの高度な式生成
- 国際配列の完全対応
- keycode リスト / picker からの選択入力

## 方針決定（MVP）

- `Esc` は Capture キャンセル専用とし、`&kp ESCAPE` は生成しない。
- 変換は `event.code` ベースにする。`event.key` は制御キーなどで必要な場合の補助に留める。
- 英字は `KeyA..KeyZ` -> `&kp A..Z`。
- 通常数字は `Digit0..Digit9` -> `&kp N0..N9`。
- `Numpad0..Numpad9` と記号キーは MVP では unsupported とする。
- `Ctrl` / `Alt` / `Meta` 付き、`event.repeat`、`event.isComposing` は無視する。
- Capture ON 中の対応キーと `Esc` だけ `preventDefault()` する。未対応キーと修飾付きショートカットでは原則 `preventDefault()` しない。

## 要件（MVP）

- Capture ON 時のみキー入力を解釈し、OFF 時は一切反映しない。
- 変換不能キーは no-op とし、理由を UI で表示する。
- 既存の `isEditableBindingExpression` 制約を満たす出力のみ反映する。
- pending preview が invalid になる入力は draft 追加前に抑止または警告する。

## 変換ルール初期案

- 英字: `KeyA..KeyZ` -> `&kp A..Z`
- 数字: `Digit0..Digit9` -> `&kp N0..N9`
- 制御キー:
  - `Enter` -> `&kp ENTER`
  - `Tab` -> `&kp TAB`
  - `Space` -> `&kp SPACE`
  - `Backspace` -> `&kp BACKSPACE`
  - `Delete` -> `&kp DEL`
  - `ArrowLeft` -> `&kp LEFT_ARROW`
  - `ArrowRight` -> `&kp RIGHT_ARROW`
  - `ArrowUp` -> `&kp UP_ARROW`
  - `ArrowDown` -> `&kp DOWN_ARROW`
- `Escape` -> Capture キャンセル。draft は変更しない。
- 変換テーブルにないキーは未対応扱い

## UI案

- Selected key の raw binding input 付近に:
  - `Capture` トグル
  - 状態表示（ON/OFF, waiting for key, unsupported key）
- Capture ON 中は短いガイド文を表示:
  - 「キーを押して `&kp` を入力」
  - 「Esc で終了」

## 実装方針

- 新規 helper（例: `src/keymap/keyCapture.js`）で key event 情報から binding への変換を純関数化。
  - テストしやすいように、helper は DOM の `KeyboardEvent` 本体ではなく `{ key, code, ctrlKey, altKey, metaKey, shiftKey, repeat, isComposing }` 相当の薄い input を受け取る。
- App state では Capture ON 時だけ `keydown` を購読。
- 反映先は既存 `draftBinding` 更新経路を利用（save ロジックは変更しない）。

## 後続フェーズ案: Keycode Picker / List Selection

MVP の key capture とは別に、後続フェーズで keycode をリストから選べる picker を追加する。

目的:

- PC キーボードで直接押しにくい keycode も選べるようにする。
- Capture で unsupported になったキーや、Esc など MVP で意図的に生成しない keycode の逃げ道を作る。
- raw text 入力、key capture、list selection の 3 経路を同じ draft / pending / preview / save all に流す。

初期スコープ（Post-Phase 2-B）:

- 対象は Bindings タブの通常キー編集。
- 対象式は `&kp KEYCODE` のみ。
- keycode list は静的な curated list から開始する。
- category と検索を持つ。
  - Letters
  - Numbers
  - Navigation
  - Editing
  - Symbols
  - Function keys
  - Modifiers
  - International / JIS
- 選択した keycode は raw binding input に `&kp KEYCODE` として反映する。
- Add/Update draft、Preview、Save all は既存フローをそのまま使う。

非スコープ（Post-Phase 2-B では実施しない）:

- `&lt` / `&mt` / `&mo` の構造化 picker。
- ZMK include からの keycode 自動抽出。
- 全 keycode の完全網羅。
- Combo/Macro への展開。

UI案:

- raw binding input 付近に `Capture` と並べて `Pick keycode` ボタンを置く。
- `Pick keycode` は小さな popover / dialog とし、検索 input、category、keycode list を表示する。
- list item には keycode、短い説明、Windows JIS 表示が分かるものは表示ラベルを併記する。
- 選択後は draft に反映し、popover を閉じる。

データ設計:

- 新規 helper（例: `src/keymap/keycodeCatalog.js`）に curated list を置く。
- 各 item は `{ code, label, category, aliases, note }` 程度にする。
- key capture の変換テーブルも、可能なら同じ catalog を参照して重複を避ける。

受け入れ基準:

- `Pick keycode` から `ESCAPE` / `F1` / `LEFT_ARROW` / `INT_YEN` などを選ぶと `&kp KEYCODE` が draft に入る。
- 検索で keycode と alias の両方から絞り込める。
- 選択した draft が Preview と Save all で既存どおり保存できる。
- unsupported な capture 入力が出ても、picker から代替 keycode を選べる。

## さらに先の方向性: Unified Binding Input

key capture と keycode picker が安定したら、raw text input を中心にしたまま、入力補助を共通化する。

- `&kp` は capture / picker / raw text の 3 経路に対応する。
- `&mo` / `&lt` / `&mt` は専用の構造化 UI を別フェーズで検討する。
- Combo/Macro へ展開する場合も、同じ keycode catalog を再利用する。
- keymap-drawer や Windows JIS 表示との整合を保つため、表示用 label と保存用 keycode は分離して扱う。

## 受け入れ基準

- キー選択 + Capture ON + `A` 押下で `&kp A` が draft に入る。
- `Enter` / `Tab` / `Space` / `Backspace` / `Delete` / 矢印が期待通りに反映される。
- `Esc` で Capture が終了し、draft は変わらない。
- Capture OFF 時はキー押下で draft が変わらない。
- 未対応キーでは draft / pending changes が変わらず、unsupported 理由が表示される。
- 追加した draft が Preview と Save all で既存どおり保存できる。

## テスト計画

- Unit:
  - 変換関数（対応キー/未対応キー/境界ケース）
- UI:
  - Capture ON/OFF 状態遷移
  - keydown 反映とキャンセル
- 回帰:
  - pending changes -> preview -> save all の既存成功ケース 1 件以上

## リスクと未決事項

- curated keycode list の初期収録範囲。
- Windows JIS 表示ラベルと保存用 keycode の対応メモをどこまで picker に出すか。
- 将来 `&lt` / `&mt` へ拡張する際の UI 設計。
