# Phase 0 調査メモ 再レビュー依頼文

以下を他 AI に渡して、`docs/zmk-studio-like-app-phase0-research.md` の **再レビュー後の状態** を確認してもらう。

直前のレビュー結果を取り込んだ後の文書が、レビュー指摘を過不足なく反映できているか、新たに別の問題を持ち込んでいないかを判断してほしい。

```md
# 再レビュー依頼

あなたには、ZMK キーボード `roBa` 用の「ZMK Studio 風アプリ」計画について、Phase 0 調査メモの **直前レビュー反映後の状態** を再レビューしてほしいです。

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
- `boards/shields/roBa/roBa.dtsi` に `roba_physical_layout` ノードが存在し、ZMK Studio はこちらを物理レイアウトとして使う
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

## 直前レビューでの指摘と反映

直前のレビュー（社内 AI が `docs/zmk-studio-like-app-phase0-research.md` を読んだもの）で、以下の重大指摘がありました。

1. ZMK Studio の物理レイアウト要件と `config/roBa.json` の関係が未整理
2. 「PC キーで roBa キーへ割り当て」要求と read-only MVP の橋渡しがない
3. ZMK Studio の永続化挙動と Restore Stock Settings の認識が未記載
4. `.keymap` round-trip の合格基準が「差分なし」止まりで、コメント・インデント・改行コード保持が未明記
5. 既存ツール比較から外れている候補（keymap-drawer Python parser、ZMK Studio の BLE GATT 経由 gRPC、urob/zmk-helpers など）

これらに対して、`docs/zmk-studio-like-app-phase0-research.md` を以下のとおり更新済みです。

- 冒頭に「最終更新」と反映項目の注記を追加
- 「既存ツール比較」表に「keymap-drawer Python parser」「ZMK Studio (transport 視点)」の 2 行を追加
- 「ZMK Studio 設定」節の後に「ZMK Studio 物理レイアウト」節を新設
  - DTS の `roba_physical_layout` を実コードで確認し、43 キー、`zmk,physical-layout` 互換、`default_transform` 4 行 11 列、`display-name = "Default"` を記載
  - DTS 座標系（1/100 単位、回転は 1/100 度）と `config/roBa.json` 座標系（1u 単位、回転は度直接）の差を記載
  - 補助 Web アプリは `config/roBa.json` を SSoT として使うが、Studio 表示との差分が出る可能性を UI で明示する判断
- 「Studio による永続化と settings_reset 運用」節を新設
  - `CONFIG_ZMK_STUDIO_LOCKING=n` のため Studio 変更は settings partition に永続化されること
  - `.keymap` 反映後に `settings_reset` または Studio の Restore Stock Settings が必要なこと
  - `build.yaml` の `settings_reset` matrix を崩さない方針
- 「.keymap 編集の必須前提」節を新設
  - 編集は AST 再生成ベースではなく、元バッファに対する `sourceRange` 単位の slice 置換で行う
  - 合格基準: 編集なし保存で差分なし、1 キー変更時に他行のコメント・空行・インデント完全一致、combo/macro/behavior/sensor-bindings 非破壊、保存前に Git diff 表示、BOM/改行コード保持
- 「MVP 範囲の再定義」末尾に「MVP に入れない理由の明記」を追加
  - 「PC キー → roBa キー割り当て」は Phase 2 に置く
  - 理由: round-trip 検証が安定する前に編集 UI を出すと差分破壊リスクが高い
  - Phase 1 でも Windows JIS 補正表は表示専用として内蔵し、Phase 2 で入力経路へ再利用する
  - Markdown 出力の主目的は「Git レビューで読みやすい層別表」と明記
- 「Claude Design に渡すべき入力」末尾に追記
  - エラー / 警告の表示方針（パース失敗、未対応 binding、Studio 由来差分の疑い）
  - 空状態 / 読み込み失敗時の表示
  - File System Access API の権限再取得 UX
  - レイヤー切替時のキー選択保持の有無
  - Windows JIS / US 切替の配置
  - 編集 UI は Phase 2 以降、Phase 1 モック上は disabled 表示
- 「次のアクション」を更新
  - Studio 永続化と `settings_reset` 運用の明文化判断を追加
  - DTS の `roba_physical_layout` 存在確認済みであることを末尾で言及

## レビュー対象

主に以下の文書を再レビューしてください。

- `docs/zmk-studio-like-app-phase0-research.md`（更新後）

可能なら、補助的に以下も参照してください。

- `docs/zmk-studio-like-app-phase0-review-request.md`（直前のレビュー依頼文）
- `docs/zmk-studio-like-app-plan.md`
- `docs/zmk-studio-like-app-plan-review.md`
- `docs/zmk-studio-like-app-plan-rereview.md`
- `config/roBa.keymap`
- `config/roBa.json`
- `keymap-drawer/roBa.yaml`
- `build.yaml`
- `boards/shields/roBa/roBa.dtsi`
- `boards/shields/roBa/roBa_R.conf`

## 特に再レビューしてほしい点

### 1. 直前指摘の反映度

直前レビューの 5 つの重大指摘 (1.-5.) は、調査メモの修正で十分にカバーできていますか？

- 反映が浅い箇所、表現が弱い箇所はありますか？
- 反映しすぎて、MVP の範囲を必要以上に膨らませている箇所はありますか？

### 2. DTS と `config/roBa.json` の整合性方針

調査メモは「DTS と `config/roBa.json` を完全一致させる必要は MVP 段階ではない」「補助アプリは `config/roBa.json` を使い、Studio 表示との差分は UI で明示する」としています。

- この判断は妥当ですか？
- ZMK Studio が DTS 由来で表示するレイアウトと、補助アプリが `config/roBa.json` で表示するレイアウトの差は、ユーザー体験として問題になりませんか？
- 一致を強制するなら、どちらを上流とすべきですか？

### 3. `.keymap` 編集の range 置換方針

調査メモは編集を `sourceRange` 単位の slice 置換に固定し、AST 再生成は採用しないとしています。

- この方針は安全ですか？
- 編集対象が `&kp` 1 個ではなく、custom behavior 名や引数を変える場合に破綻しませんか？
- combo / macro / sensor-bindings の編集を Phase 5 で扱う際、range 置換だけで足りますか？

### 4. Studio 永続化の取り扱い

調査メモは `.keymap` 反映後に `settings_reset` または Restore Stock Settings を実行する運用ルールを明記しました。

- この運用は roBa の現実環境で妥当ですか？
- `settings_reset` を毎回流すのは過剰ではないですか？
- Studio で行った変更を repo `.keymap` に転記する仕組みは Phase 4 以降でよいですか？

### 5. PC キー割り当て要求の Phase 配置

調査メモは「PC キーを押して roBa キーに割り当てる」をユーザー初期要求の中核と認めつつ、Phase 1 (read-only) から外して Phase 2 に置いています。

- この Phase 配置は妥当ですか？
- ユーザー要求の中核を MVP から外す代わりに、補うべき情報やプロトタイプはありますか？

### 6. Markdown 出力の主目的

調査メモは Markdown 出力の主目的を「Git レビューで読みやすい層別表」と限定しました。

- この限定は妥当ですか？
- ドキュメント生成 / 共有 / blog 用途を後回しにしてよいですか？
- 出力テンプレートは MVP で 1 種類に絞るべきですか、複数用意すべきですか？

### 7. Claude Design 引き渡し情報の追加項目

調査メモは Claude Design に渡す情報として以下を追加しました。

- エラー / 警告表示方針
- 空状態 / 読み込み失敗
- File System Access 権限再取得 UX
- レイヤー切替時のキー選択保持
- Windows JIS / US 切替の配置
- Phase 1 で編集 UI は disabled 表示

- 追加すべき UI 要件、制約、操作フローはありますか？
- 入れすぎていてモックアップ作成が重くなる項目はありますか？

### 8. 既存ツール比較への追加候補

直前レビューで `urob/zmk-helpers` の言及推奨がありましたが、調査メモには反映していません（roBa が依存していないため）。

- この判断は妥当ですか？
- 比較表に他に追加すべきツールはありますか？
- `keymap-drawer` を Python parser として呼ぶ案と、JS 側で再実装する案、どちらを優先すべきですか？

## 出力形式

以下の形式で再レビューしてください。

1. **総評**
   - 直前指摘の反映度を短く評価してください。

2. **反映が不足している点**
   - レビュー指摘を取り込みきれていない箇所、表現が弱い箇所を優先度順に挙げてください。

3. **反映しすぎている点**
   - 過剰反映で MVP 範囲・実装難度・モックアップ規模を膨らませている箇所を挙げてください。

4. **新たに気付いた点**
   - 直前レビューでは触れていないが、更新後の文書で目に付いた問題があれば挙げてください。

5. **保留でよい点**
   - 今すぐ決めなくてよいこと、MVP 後でよいことを挙げてください。

6. **次にやるべきこと**
   - Keymap Editor 実地確認、Claude Design モックアップ依頼、自作 MVP 実装準備のどれを優先すべきか提案してください。

7. **文書への具体的な修正案**
   - 可能なら、`docs/zmk-studio-like-app-phase0-research.md` に追記または修正すべき文言を提案してください。

## 注意

- roBa の既存運用では `config/roBa.keymap` が正本です。
- `build.yaml` の roBa_R `snippet: studio-rpc-usb-uart` は消したり移動したりしない前提です。
- `build.yaml` の `settings_reset` matrix も崩さない前提です。
- roBa_L / roBa_R の物理配置と Kconfig flag の有無を混同しないでください。
- PMW3610 / SPI / ZMK Studio / encoder の side-specific 設定を、対称化すべきとは限りません。
- DTS の `roba_physical_layout` は実在し、43 キー定義済みです。座標系は `config/roBa.json` と異なります。
- できるだけ、既存ツールを活かして自作範囲を減らす観点で再レビューしてください。
- レビュー反映で MVP 範囲が膨らんでいないかも観点に入れてください。
```
