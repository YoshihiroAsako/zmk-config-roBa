# Phase 0 調査メモ 再レビュー結果

再レビュー日: 2026-05-04

対象:

- 再レビュー依頼文: `docs/zmk-studio-like-app-phase0-rereview-request.md`
- 更新後調査メモ: `docs/zmk-studio-like-app-phase0-research.md`

参照:

- ZMK Studio 公式ドキュメント: https://zmk.dev/docs/features/studio
- ZMK physical layout 公式ドキュメント: https://zmk.dev/docs/development/hardware-integration/physical-layouts
- ZMK Studio RPC 実装: https://github.com/zmkfirmware/zmk/tree/main/app/src/studio
- roBa DTS: `boards/shields/roBa/roBa.dtsi`
- roBa keymap: `config/roBa.keymap`

## 1. 総評

直前レビューの重大指摘は、おおむね十分に反映されている。

特に以下は改善として有効。

- DTS の `roba_physical_layout` を実コードで確認したこと
- `config/roBa.json` と DTS physical layout を別系統として扱う方針にしたこと
- ZMK Studio と repo `.keymap` のずれを明記したこと
- `.keymap` 編集を `sourceRange` slice 置換に限定したこと
- PC キー入力による割り当てを Phase 2 に下げた理由を明記したこと
- Claude Design に渡す UI 制約が具体化されたこと

ただし、更新後の調査メモには修正した方がよい表現がいくつかある。

最重要は、**Studio 変更の永続化を `CONFIG_ZMK_STUDIO_LOCKING=n` と直接結びつけすぎている点**。`CONFIG_ZMK_STUDIO_LOCKING=n` は Studio 操作時のロック機構に関する設定であり、「Studio 変更が settings partition に保存される」こと自体の説明としては少し強すぎる。永続化は ZMK Studio のキーマップ管理挙動として説明し、`LOCKING=n` は「ロック解除操作なしで変更できるため、意図せず変更しやすい」というリスクとして書く方が正確。

## 2. 反映が不足している点

### 2.1 Studio 永続化と `LOCKING=n` の関係

不足というより、表現の精度を上げたい。

現在:

> `CONFIG_ZMK_STUDIO_LOCKING=n` のため、Studio から行った変更は settings partition に永続化される。

修正推奨:

> ZMK Studio で行った keymap 変更は settings 側に保存され、repo `.keymap` を再ビルドしても旧 Studio 設定が残る場合がある。`CONFIG_ZMK_STUDIO_LOCKING=n` はロック解除なしで Studio 変更できる設定なので、意図せず repo canonical からずれるリスクが高い。

理由:

- `LOCKING=n` は永続化の根本原因ではなく、変更操作の安全装置を弱める設定として扱う方が自然。
- roBa は `LOCKING=n` なので、repo canonical 運用では注意表示が必要。

### 2.2 `settings_reset` の扱いが少し強い

`.keymap` 反映後に `settings_reset` または Restore Stock Settings が必要、という方向は妥当。

ただし、`settings_reset` は BLE pairing など Studio 以外の settings も消す可能性があるため、毎回の標準手順にするには強い。

修正推奨:

- 第一候補: ZMK Studio の Restore Stock Settings
- 第二候補: `settings_reset` firmware
- `settings_reset` は「Studio にアクセスできない」「状態が壊れた」「全 settings を初期化したい」場合の手段として位置付ける

### 2.3 DTS と `config/roBa.json` の整合チェック項目

「完全一致不要」は妥当。

ただし、MVP でも最低限の整合チェックはあった方がよい。

追記推奨:

- DTS physical layout と `config/roBa.json` の key count が一致すること
- `.keymap` layer bindings の position count が一致すること
- position order が破綻していないこと
- 座標差は warning 扱いでよく、blocking error にはしない

特に roBa は `config/roBa.json` が 43 keys、DTS も 43 keys、`.keymap` も各 layer 43 bindings なので、この三者一致は「補助アプリの初期ロード時チェック」として価値がある。

### 2.4 `sourceRange` 置換の単位

`sourceRange` slice 置換方針は妥当。

ただし、「token 単位」ではなく **binding expression 全体** を置換単位にする、と明記した方が安全。

理由:

- `&kp LS(LG(S))`
- `&bt BT_SEL 0`
- `&lt_to_layer_0 6 INT_HENKAN`

これらは behavior と引数の数が違う。キー種別を変えると引数数も変わるため、`&kp` や `A` だけの token 置換では壊れやすい。

修正推奨:

> Phase 2 の 1 キー編集では、対象 key position に対応する binding expression 全体の `sourceRange` を置換する。置換前後の binding expression が 1 key position として parse できることを検証する。

### 2.5 既存ツール実地確認の合格基準

「Keymap Editor を試す」が次アクションになっているのは良い。

ただし、何をもって「使える」とするかがまだ曖昧。

追加推奨の確認項目:

- `config/roBa.keymap` を読み込めるか
- `config/roBa.json` の layout が自動適用されるか
- `default_layer` / `FUNCTION` など layer 名が期待通り出るか
- custom behavior `lt_to_layer_0` を表示できるか
- `sensor-bindings` を表示または保持できるか
- 保存したときに不要な差分が出ないか
- GitHub なしの File System / Clipboard 経路で運用できるか

## 3. 反映しすぎている点

### 3.1 Claude Design への入力が少し多い

エラー状態、権限再取得、Studio 由来差分、Windows JIS / US 切替、disabled 編集 UI などを全部入れるのは、設計素材としては良い。

ただし、最初のモックアップ依頼では少し情報量が多く、画面が重くなりやすい。

おすすめは、Claude Design への依頼を 2 段階にすること。

1. **MVP メイン画面モック**
   - layer list
   - visual keyboard
   - selected key detail
   - bindings table
   - Markdown preview
   - read-only badge
2. **状態・警告モック**
   - parse error
   - File System permission lost
   - Studio divergence warning
   - unsupported binding warning

### 3.2 Studio transport 視点は Phase 4 まで深掘り不要

USB CDC ACM / BLE GATT / gRPC を比較表に入れたのは良いが、MVP では公式 Studio 併用なので、ここを今掘る必要はない。

調査メモ上は「Phase 4 の確認事項」として残し、Phase 0 の判断材料からは少し下げてよい。

## 4. 新たに気付いた点

### 4.1 `config/roBa.json` の `sensors.enabled: false` の意味

`config/roBa.json` では `left_encoder` / `right_encoder` が `enabled: false` になっている。一方で `.keymap` には `sensor-bindings` が存在する。

この差は UI で混乱しやすい。

追記推奨:

- `config/roBa.json` の sensor metadata は表示配置メタデータとして扱う
- 実際に layer ごとの sensor behavior があるかは `.keymap` の `sensor-bindings` を正とする
- `enabled: false` はアプリが「エンコーダが無い」と断定する根拠にしない

### 4.2 Markdown 出力は keymap-drawer YAML だけでは不足

調査メモには既に「sensor-bindings は keymap-drawer YAML に見えない」とある。

このため Markdown 出力の入力源は、`keymap-drawer/roBa.yaml` ではなく `.keymap` 解析結果を主にするのがよい。

追記推奨:

> Markdown 出力は `.keymap` 解析結果を主入力にする。`keymap-drawer/roBa.yaml` は表示ラベル比較や SVG との整合確認に限定する。

### 4.3 read-only MVP でも parser risk は残る

read-only なら保存破壊リスクはないが、一覧や Markdown が誤っていると後工程の判断を誤る。

最低限の read-only 検証として、以下を入れるとよい。

- 各 layer の binding count が 43
- combo count が 5
- macro count が 1
- custom behavior count が 1
- sensor-bindings count が 2
- keymap-drawer YAML と主要 label が大きく乖離しない

## 5. 保留でよい点

以下は MVP 後でよい。

- Studio RPC の自作
- BLE GATT 経由の通信実装
- combo / macro / custom behavior の編集
- DTS physical layout と `config/roBa.json` の座標完全同期
- Markdown テンプレート複数化
- blog / 共有ページ向けの整形
- Keymap Editor fork
- urob/zmk-helpers の詳細比較

`urob/zmk-helpers` は roBa が依存していないため、比較表に無理に入れなくてよい。今は「ZMK keymap 記法を増やす補助マクロ例」として保留で十分。

## 6. 次にやるべきこと

優先順位は以下。

1. **Keymap Editor 実地確認**
   - 既存ツールでどこまで満たせるかが分からないと、自作範囲が決まらない。
   - `config/roBa.keymap` / `config/roBa.json` を実際に使って確認する。
2. **Claude Design モックアップ依頼文作成**
   - Keymap Editor 実地確認で足りない画面が分かった後に作る方が精度が上がる。
   - ただし先に read-only 補助アプリ前提のモックを作るのも可。
3. **read-only MVP 実装準備**
   - 実装は Keymap Editor 確認とモックアップ後でよい。

現時点では、自作 MVP 実装に入るのは少し早い。

## 7. 文書への具体的な修正案

`docs/zmk-studio-like-app-phase0-research.md` に以下を反映するとよい。

### Studio 永続化節の修正

現在の文:

```md
`CONFIG_ZMK_STUDIO_LOCKING=n` のため、Studio から行った変更は settings partition に永続化される。
```

修正案:

```md
ZMK Studio で行った keymap 変更は settings 側に保存され、repo `.keymap` を再ビルドしても Studio 側の旧変更が残る場合がある。`CONFIG_ZMK_STUDIO_LOCKING=n` はロック解除なしで Studio 変更できる設定なので、repo canonical 運用では意図せず差分が生まれやすい点に注意する。
```

### Restore Stock Settings / settings_reset の優先順位

追記案:

```md
repo `.keymap` を正として戻したい場合、まず ZMK Studio の Restore Stock Settings を優先する。`settings_reset` firmware は Studio にアクセスできない場合、settings 全体を初期化したい場合、または状態が壊れた場合の手段として扱う。`settings_reset` は BLE pairing など Studio 以外の settings も消す可能性があるため、通常運用で毎回必須とはしない。
```

### 整合チェック

追記案:

```md
補助 Web アプリの初期ロード時には、`config/roBa.json`、DTS physical layout、`.keymap` layers の key position count が一致するか確認する。座標差は warning、key count / position count の不一致は blocking error とする。
```

### `sourceRange` 置換

追記案:

```md
Phase 2 の 1 キー編集では、key position に対応する binding expression 全体を `sourceRange` として置換する。behavior 名や引数 token の部分置換は行わない。置換後に対象 layer の binding count が変わっていないことを検証する。
```

### Keymap Editor 実地確認項目

追記案:

```md
Keymap Editor 実地確認では、読み込み可否だけでなく、layout 適用、custom behavior 表示、sensor-bindings 保持、保存後差分、File System / Clipboard 経路の使い勝手を確認する。
```

## 最終判断

更新後の Phase 0 調査メモは、次工程に進める水準にある。

ただし、次に進む前に以下だけ軽く修正するとよい。

- Studio 永続化と `LOCKING=n` の関係を正確化する
- Restore Stock Settings と `settings_reset` の優先順位を分ける
- DTS / `roBa.json` / `.keymap` の count 整合チェックを追加する
- `sourceRange` 置換は binding expression 全体に限定する
- Keymap Editor 実地確認の合格基準を具体化する

これらを反映したら、次は Keymap Editor 実地確認へ進むのが妥当。
