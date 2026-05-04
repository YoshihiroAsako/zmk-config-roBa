# roBa 用 ZMK Studio 風アプリ Phase 0 調査メモ

調査日: 2026-05-04
最終更新: 2026-05-04 (Phase 0 再レビュー反映: Studio 永続化表現の修正、Restore Stock Settings 優先、count 整合チェック、binding expression 単位の range 置換、Keymap Editor 実地確認基準)

対象計画書: `docs/zmk-studio-like-app-plan.md`

## 結論

最初から ZMK Studio 互換アプリをフルスクラッチで作る必要は薄い。

現時点の推奨は以下。

1. **既存 Keymap Editor をまず評価する**
   - ローカル `.keymap` 読み書き、視覚編集、combo / macro / encoder 対応などが既にある。
   - `config/roBa.json` が存在するため、roBa は Keymap Editor 系のメタデータを既に持っている。
2. **自作するなら補助 Web アプリから始める**
   - Keymap Editor が弱い、または roBa 専用にしたい Markdown 出力、Windows JIS 表示、一覧出力、差分確認に絞る。
   - 技術は Vite + React のローカル Web アプリを第一候補にする。
3. **直接反映は公式 ZMK Studio 併用**
   - roBa_R は `CONFIG_ZMK_STUDIO=y`、`CONFIG_ZMK_STUDIO_LOCKING=n`。
   - `build.yaml` でも roBa_R に `snippet: studio-rpc-usb-uart` が付いている。
   - 自作 RPC は MVP から外す。
4. **roBa の正本は `config/roBa.keymap`**
   - ZMK Studio 側の runtime/settings 状態と repo `.keymap` はずれうる。
   - 当面は repo canonical とし、Studio は試用・直接変更・確認用として扱う。

## 既存ツール比較

| ツール | できること | roBa で使えそうな点 | 足りない点 / 注意 |
| --- | --- | --- | --- |
| Keymap Editor | ZMK `.keymap` の Web 視覚編集、GitHub / Clipboard / File System 入力、combo / macro / behavior / rotary encoder 対応 | 要求仕様のうち「視覚表示」「ローカル編集」「GitHubなし編集」に近い。`config/roBa.json` と相性がよい可能性が高い | Markdown出力、Windows JIS補正、repo正本運用の明示は別途必要。GitHub README では最近のソース更新が公開されていないため fork 前提は危険 |
| ZMK Studio | 対応ファームウェア上でランタイム keymap 変更 | roBa_R で既に有効化済み。直接反映要求に最も近い | `.keymap` 正本との同期問題がある。新規 behavior 定義や物理レイアウト定義などは不可/制約あり |
| keymap-drawer | ZMK keymap を YAML 化し、SVG 表示を生成 | 既に `keymap-drawer/roBa.yaml` と `.svg` がある。表示ラベルや SVG との比較元に使える | 編集アプリではない。YAML を `.keymap` の正本にするのは危険。sensor-bindings など Markdown 出力に必要な全情報は持たない |
| keymap-drawer Python parser | Python ライブラリとして `.keymap` を parse できる | Markdown 出力の入力源候補。ロジックを参考にもできる | JS 側へ移植するか Python 経由で呼ぶかは別判断 |
| ZMK Studio (transport 視点) | USB CDC ACM / BLE GATT 上の gRPC で通信 | Phase 4 で BLE 接続も検討対象になる | Web Bluetooth / Web Serial / WebHID で前提が異なる。USB だけと決めつけない |
| roBa 専用自作 Web アプリ | Markdown出力、Windows JIS補正、一覧表示、差分確認を roBa 向けに最適化 | 要求仕様の補助部分に強い。既存ツールと併用しやすい | `.keymap` 編集を広げるとパーサ難度が上がる。最初は read-only 推奨 |

## 参照した外部情報

- ZMK Studio 公式ドキュメント: https://zmk.dev/docs/features/studio
  - USB接続中の変更、ネイティブアプリ、対応済み/未対応機能、`.keymap` と Studio 管理の注意が記載されている。
- ZMK keymaps 公式ドキュメント: https://zmk.dev/docs/keymaps
  - keymap は devicetree 構文で、behavior / sensor / layer に binding する構造。
- Keymap Editor GitHub: https://github.com/nickcoutsos/keymap-editor
  - WYSIWYG編集、File System入力、combo / macro / behavior / rotary encoder 対応が記載されている。
  - 最近のソース更新が公開されていない旨も明記されている。
- Keymap Editor 作者説明: https://nickcoutsos.github.io/projects/keymap-editor/
  - File System Access API、tree-sitter + devicetree grammar による AST 操作の説明がある。
- keymap-drawer: https://github.com/caksoylar/keymap-drawer
  - ZMK keymap の parse / draw、YAML、SVG、hold-tap / combo 可視化に対応。
- tree-sitter-devicetree: https://pypi.org/project/tree-sitter-devicetree/
  - Zephyr devicetree superset 対応の grammar が存在する。

## roBa 既存データ調査

### `config/roBa.json`

Keymap Editor 用メタデータとして扱うのが自然。

確認できた内容:

- `default_layout` が存在する
- 物理キーは 43 個
  - row 0: 10 keys
  - row 1: 12 keys
  - row 2: 12 keys
  - row 3: 9 keys
- `x` / `y` 座標を持つ
- 親指周辺などに `r` / `rx` / `ry` の回転情報を持つ
- `sensors` に `left_encoder` / `right_encoder` がある
- sensor metadata は `enabled: false`

判断:

- roBa 専用アプリの物理レイアウト SSoT 第一候補にする。
- sensor metadata の `enabled: false` と `.keymap` 側の `sensor-bindings` は別扱いにする。
- `config/roBa.json` の sensor metadata は表示配置メタデータとして扱い、実際に layer ごとの sensor behavior があるかは `.keymap` の `sensor-bindings` を正とする。
- `enabled: false` は補助アプリが「エンコーダが無い」と断定する根拠にしない。

### `config/roBa.keymap`

確認できた構造:

- layer は 7 個
  - `default_layer`
  - `FUNCTION`
  - `NUM`
  - `ARROW`
  - `MOUSE`
  - `SCROLL`
  - `layer_6`
- 各 layer の bindings は 43 position
- combos は 5 個
  - `tab`
  - `shift_tab`
  - `muhennkann`
  - `double_quotation`
  - `eq`
- macros は 1 個
  - `to_layer_0`
- custom behavior は 1 個
  - `lt_to_layer_0`
- sensor-bindings は 2 layer に存在
  - `default_layer`: `&inc_dec_kp PG_UP PAGE_DOWN`
  - `ARROW`: `&inc_dec_kp LC(PAGE_UP) LC(PAGE_DOWN)`

binding 種別:

- `&kp`
- `&mt`
- `&lt`
- `&mo`
- `&lt_to_layer_0`
- `&to_layer_0`
- `&bt`
- `&mkp`
- `&bootloader`
- `&trans`

編集上の注意:

- `&kp LS(LG(S))` のようなネストした modifier がある。
- `&lt_to_layer_0 6 INT_HENKAN` のような custom behavior がある。
- `&bt BT_SEL 0` のような多引数 behavior がある。
- 単純な split / replace で安全に編集するのは危険。

### `keymap-drawer/roBa.yaml`

確認できた内容:

- `layout: {zmk_keyboard: roBa}`
- 7 layer 分の表示がある
- combos 5 個が表示されている
- hold-tap / layer-tap は `{t, h}` 形式で見やすく表示されている
- sensor-bindings は見えていない

判断:

- 表示ラベル確認、Markdown/SVG比較には有用。
- ただし sensor-bindings や `.keymap` の全情報は持たないため、正本にはしない。
- Markdown 出力は `.keymap` 解析結果を主入力にする。`keymap-drawer/roBa.yaml` は表示ラベル比較や SVG との整合確認に限定する。

### ZMK Studio 設定

`boards/shields/roBa/roBa_R.conf`:

- `CONFIG_ZMK_STUDIO=y`
- `CONFIG_ZMK_STUDIO_LOCKING=n`
- `CONFIG_ZMK_POINTING=y`
- PMW3610 trackball 設定あり

`build.yaml`:

- `roBa_R` に `snippet: studio-rpc-usb-uart`
- `roBa_L` と `settings_reset` も matrix に含まれる

判断:

- 公式 ZMK Studio で直接反映を試す前提は整っている。
- AGENTS.md の通り、roBa_R の snippet と `.conf` 設定は崩さない。

### ZMK Studio 物理レイアウト

ZMK Studio はデバイス側 DTS の `physical-layout` ノードを基にキー配置を提示する。

`boards/shields/roBa/roBa.dtsi` を確認した結果:

- `roba_physical_layout` ノードが定義済み (`compatible = "zmk,physical-layout"`)
- `chosen` で `zmk,physical-layout = &roba_physical_layout` が選ばれている
- `keys` プロパティに 43 個の `&key_physical_attrs` がある
- `transform` は `&default_transform` (4 行 11 列のマトリクス変換)
- `display-name = "Default"`

座標系:

- DTS は 1/100 単位 (例: `100 100 0 37` → 1u × 1u, x=0.0u, y=0.37u)
- `config/roBa.json` は 1u 単位 (例: `x: 0, y: 0.616`) で持っている
- 親指列の `r` は DTS が 1/100 度 (`1000` = 10°)、`config/roBa.json` は度直接 (`r: 9`)
- 厳密にはわずかな差があるため、両者を完全に同一とみなさない

判断:

- ZMK Studio が roBa_R で表示するキー配置は DTS 由来であり、`config/roBa.json` とは別物として扱う。
- 補助 Web アプリは `config/roBa.json` を物理レイアウト SSoT として使ってよいが、Studio 側との表示差分が出る可能性を UI で明示する。
- DTS と `config/roBa.json` の座標差を Phase 0 で完全一致させる必要はない。レイアウトを変える変更があったときだけ両者の整合性を確認する。
- 補助 Web アプリの初期ロード時には、`config/roBa.json`、DTS physical layout、`.keymap` layers の key position count が一致するか確認する。座標差は warning、key count / position count の不一致は blocking error とする。

### Studio による永続化と settings_reset 運用

ZMK Studio で行った keymap 変更は settings 側に保存され、repo `.keymap` を再ビルドしても Studio 側の旧変更が残る場合がある。

`CONFIG_ZMK_STUDIO_LOCKING=n` はロック解除なしで Studio 変更できる設定なので、repo canonical 運用では意図せず差分が生まれやすい点に注意する。

含意:

- `.keymap` を更新して再ビルド・書き込みしても、Studio 由来の旧変更が残ることがある。
- 「repo canonical」を運用上成立させるには、`.keymap` 反映後に Studio の Restore Stock Settings を実行するか、必要に応じて `settings_reset` を書き込む手順が必要。
- repo `.keymap` を正として戻したい場合、まず ZMK Studio の Restore Stock Settings を優先する。
- `settings_reset` firmware は Studio にアクセスできない場合、settings 全体を初期化したい場合、または状態が壊れた場合の手段として扱う。
- `settings_reset` は BLE pairing など Studio 以外の settings も消す可能性があるため、通常運用で毎回必須とはしない。
- `build.yaml` matrix に `settings_reset` が含まれている点は崩さない。

補助アプリ側:

- 「最後に repo `.keymap` をビルド/書き込みした日時」と「Studio で変更した可能性あり」を区別して UI に出せる余地を残す。
- ただし MVP では実装しない。「Studio で変更した可能性は手動で意識する」を運用ルールにする。

## 要求仕様ごとの対応方針

| 要求 | 既存ツールでの対応 | 推奨方針 |
| --- | --- | --- |
| GitHubを経由しない直接変更 | Keymap Editor は File System入力あり。ZMK Studio は直接反映あり | `.keymap` 編集は Keymap Editor / 自作補助Web、デバイス直接反映は公式 Studio |
| PCキーボードで押したキーを割り当て | Keymap Editor が近い可能性あり。ただし Windows JIS補正は不明 | MVPでは後回し。自作するなら Windows JIS 変換表込みで実装 |
| ビジュアルレイアウト表示 | Keymap Editor / keymap-drawer が対応 | まず Keymap Editor で roBa.json が使えるか確認。自作では roBa.json を使う |
| 各キー一覧表示 | Keymap Editor は画面表示中心。keymap-drawer YAML から一部取得可能 | 自作補助Webまたはスクリプトで Markdown/JSON出力する価値あり |
| Markdown出力 | 既存ツールでは主目的ではない | roBa専用補助機能として自作する価値が高い |
| 直接反映可否表示 | ZMK Studio の機能範囲に依存 | 自作アプリでは分類表示のみ。反映自体は公式 Studio |

## fork / 併用 / 自作の判断

### そのまま Keymap Editor を使う

メリット:

- 最も早く視覚編集を試せる
- `.keymap` パースと編集の難所を避けられる
- File System Access API 対応がある

デメリット:

- roBa 専用 Markdown 出力は別途必要
- Windows JIS 補正の UX は期待しすぎない方がよい
- repo canonical 運用の警告や差分確認は別に欲しい

判断:

- **最初に試す価値が高い**。

### Keymap Editor を fork する

メリット:

- 既存のパーサ / UI を流用できる可能性がある
- roBa 専用機能を同じ画面に足せる可能性がある

デメリット:

- GitHub README 上、最近のソース更新は公開されていない。
- 現在の Web アプリ機能と公開ソースが一致しない可能性がある。
- fork の保守コストが読みにくい。

判断:

- **Phase 0 では保留**。まず既存アプリを使い、足りないものを補助ツール化する。

### roBa 専用補助 Web アプリを自作する

メリット:

- Markdown 出力、Windows JIS 補正、repo正本運用、差分確認に集中できる
- `.keymap` 編集を read-only / 1キー変更に絞れば難度を抑えられる
- Claude Design モックアップから実装しやすい

デメリット:

- `.keymap` パースを少なくとも表示用に実装する必要がある
- 編集対応を広げると急に難しくなる

判断:

- **MVP候補として有力**。
- ただし最初は read-only の表示 / Markdown / JSON 出力まで。

## .keymap 編集の必須前提

編集は AST 再生成ベースではなく、元ファイルバッファに対する `sourceRange` 単位の slice 置換で行う。

理由:

- `config/roBa.keymap` にはコメント・空行・列揃えインデント・`#include`・C プリプロセッサが混在する。
- AST → serialize 経路ではこれらの保持が困難で、tree-sitter 系でも完全な往復は保証されない。
- range 置換なら、変更対象 binding expression 以外のバイト列は完全に保存できる。

Phase 2 の 1 キー編集では、key position に対応する binding expression 全体を `sourceRange` として置換する。behavior 名や引数 token の部分置換は行わない。

例:

- `&kp LS(LG(S))`
- `&bt BT_SEL 0`
- `&lt_to_layer_0 6 INT_HENKAN`

これらは全体を 1 つの binding expression として扱う。

合格基準:

- 編集なしで保存して差分が出ない。
- 1 キー変更で、変更行以外のコメント・空行・インデントが完全一致する。
- combo / macro / custom behavior / sensor-bindings が消えない。
- 保存前に Git diff 相当の差分を表示する。
- 元ファイルの BOM / 改行コード (CRLF/LF) を保持する。
- 置換後に対象 layer の binding count が変わっていないことを検証する。

## MVP 範囲の再定義

Phase 0 調査後の推奨 MVP:

- Vite + React のローカル Web アプリ
- read-only
- 入力:
  - `config/roBa.keymap`
  - `config/roBa.json`
  - 必要に応じて `keymap-drawer/roBa.yaml`
- 表示:
  - 7 layer
  - 43 key positions
  - combos
  - macros
  - custom behaviors
  - sensor-bindings
- 出力:
  - Markdown
  - JSON
- 補助:
  - Windows JIS 表示名
  - keymap-drawer 表示との差分メモ
  - 公式 ZMK Studio への導線

read-only MVP の検証基準:

- 各 layer の binding count が 43
- combo count が 5
- macro count が 1
- custom behavior count が 1
- sensor-bindings count が 2
- `config/roBa.json` の key count が 43
- DTS physical layout の key count が 43
- keymap-drawer YAML と主要 label が大きく乖離しない

MVP に入れない:

- デバイスへの直接反映
- combo / macro / behavior の編集
- layer 追加
- physical layout 定義編集
- 自作 Studio RPC

### MVP に入れない理由の明記

ユーザー初期要求の中核に「PC キーを押して roBa キーへ割り当て」がある。これを MVP から外す理由と復帰タイミングを明記しておく。

- Phase 1 (read-only) では除外する。
- 理由: `.keymap` round-trip 検証が安定する前に編集 UI を出すと、コメント・インデント・他キーの差分破壊リスクが高い。
- Phase 2 で 1 キー編集経路として復帰させる。
- Phase 1 段階でも Windows JIS 補正表は表示専用として内蔵し、Phase 2 で入力経路へそのまま再利用する。
- Markdown 出力の主目的は **「Git レビューで読みやすい層別表」** とする。ドキュメント生成や共有用途は MVP では副次目的。

## Claude Design に渡すべき入力

Phase 0.5 で Claude Design に渡す情報:

- roBa は 43 keys / 7 layers
- 物理配置は `config/roBa.json` を使う
- 操作対象はまず read-only
- メイン画面に必要な情報:
  - layer list
  - visual keyboard
  - selected key detail
  - bindings table
  - combos tab
  - macros / behaviors tab
  - sensor-bindings tab
  - Markdown preview
  - official ZMK Studio link/status
- UI上で区別したい状態:
  - repo canonical
  - Studio direct possible
  - build required
  - read-only for MVP
  - Windows JIS display
- エラー / 警告の表示方針:
  - パース失敗
  - 未対応 binding (新規 custom behavior など)
  - Studio 由来差分の疑い
- 空状態 / 読み込み失敗時の表示
- File System Access API の権限再取得 UX (ブラウザ再起動後の再付与)
- レイヤー切替時のキー選択保持の有無
- Windows JIS / US 切替を最上段に置くか詳細パネル内に置くか
- 編集 UI を出すのは Phase 2 以降であり、Phase 1 モック上は disabled 表示にする

## 次のアクション

1. Keymap Editor を実際に roBa の `config/roBa.keymap` / `config/roBa.json` で試す。
2. Keymap Editor で以下を確認する。
   - `config/roBa.keymap` を読み込めるか
   - `config/roBa.json` の layout が自動適用されるか
   - `default_layer` / `FUNCTION` など layer 名が期待どおり出るか
   - custom behavior `lt_to_layer_0` を表示できるか
   - `sensor-bindings` を表示または保持できるか
   - 保存したときに不要な差分が出ないか
   - GitHub なしの File System / Clipboard 経路で運用できるか
3. Keymap Editor で Markdown 出力相当がないことを確認する。
4. ZMK Studio 永続化、Restore Stock Settings、`settings_reset` 運用手順を AGENTS.md / docs に明文化するかを判断する。
5. Claude Design に渡す UI モックアップ依頼文を作る。
6. その後、read-only 補助 Web アプリの実装要否を決める。

DTS の `roba_physical_layout` は既に存在することを Phase 0 で確認済み (`boards/shields/roBa/roBa.dtsi`)。`config/roBa.json` との座標完全一致は MVP の必須条件ではない。

## 現時点の判断

自作アプリの役割は「ZMK Studio の代替」ではなく、**roBa の repo canonical なキーマップ管理補助**に寄せるのがよい。

直接反映は公式 ZMK Studio、視覚編集はまず Keymap Editor、記録・一覧・Markdown・Windows JIS補正・差分確認は roBa 専用補助Webアプリ、という分担が最も現実的。
