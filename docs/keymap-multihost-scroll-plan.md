# roBa マルチホスト・Windows JIS・トラックボールスクロール対応プラン

> このドキュメントは、別の AI レビュアーが**前提知識ゼロ**でレビューできるように自己完結的に書かれています。
> レビュアーへ：末尾の「レビュー観点」に沿って、賛否・代替案・見落としを指摘してください。

---

## 0. レビュー依頼の目的

`zmk-config-roBa` のキーマップを、主に **Windows OS + JIS 配列**で使いやすくしつつ、**Mac の US 配列**、**iPad**、**iPhone**、**Android / Galaxy Z Fold6** でも破綻しにくい設定にしたい。

また、ユーザーから「**トラックボールでスクロールできるような機能を付けたい**」という要望がある。

本ドキュメントは、実装前のプランレビュー用である。現時点では `config/roBa.keymap` などの実装ファイルは変更しない。

---

## 1. プロジェクト背景

### 1.1 対象プロジェクト

- **リポジトリ名**：`zmk-config-roBa`
- **対象ハードウェア**：roBa — 自作分割キーボード
  - MCU：`seeeduino_xiao_ble`（nRF52840）
  - 物理的な左手側 `roBa_L`：エンコーダ搭載
  - 物理的な右手側 `roBa_R`：PMW3610 トラックボールと SPI 配線
- **ファームウェア**：ZMK Firmware
- **追加ドライバ**：`kumamuk-git/zmk-pmw3610-driver`
- **ビルド**：GitHub Actions の `build.yaml` で `roBa_L` / `roBa_R` / `settings_reset` をビルド

### 1.2 利用予定ホスト

優先順位は以下の通り。

| 優先度 | ホスト | OS / 配列 | 想定 |
|---|---|---|---|
| 1 | メイン PC | Windows + JIS 配列 | 大半の利用。最優先で最適化する |
| 2 | Mac | macOS + US 配列 | 補助的に利用 |
| 3 | iPad | iPadOS | 補助的に利用 |
| 4 | iPhone | iOS | 補助的に利用 |
| 5 | Android | Galaxy Z Fold6 など | 補助的に利用 |

---

## 2. 現状整理

### 2.1 現在のキーマップの特徴

現在の `config/roBa.keymap` には、すでに以下の要素がある。

- `default_layer`
- `FUNCTION`
- `NUM`
- `ARROW`
- `MOUSE`
- `SCROLL`
- `layer_6`
- `INT_HENKAN` / `INT_MUHENKAN`
- `BT_SEL 0` から `BT_SEL 4`
- `&trackball` 設定

`default_layer` の親指周辺には `INT_HENKAN` / `INT_MUHENKAN` があり、Windows JIS の日本語入力切替に向いた構成になっている。

### 2.2 現在のトラックボール関連設定

現在の `config/roBa.keymap` には以下の設定がある。

```c
&trackball {
    automouse-layer = <4>;
    scroll-layers = <5>;
};
```

また、`default_layer` では `I` キーが以下のようになっている。

```c
&lt 5 I
```

つまり、現在も設計上は「`I` 長押しで `SCROLL` レイヤーに入り、トラックボールをスクロール用途にする」構造がある。

ただし、ZMK の `&lt` のデフォルト flavor は `tap-preferred` で、`tapping-term-ms` が経過するか他キーが押されるまで hold 側 (= layer 5) は有効化されない。トラックボールの動きはキー押下イベントを発火しないため、ユーザー体感として「押してすぐ転がしたのにスクロールしない」状態になる。

### 2.3 既存の独自 macro / behavior

`config/roBa.keymap` には以下の独自定義がある。第 3 段階で Mac / モバイル補助レイヤーを設計する際、これらの戻り挙動を壊さないことを前提条件とする。

- `to_layer_0` macro: 引数のキーコードを送りつつ `&to 0` でベースレイヤーに戻る。
- `lt_to_layer_0` behavior: hold 側が `&mo`、tap 側が `&to_layer_0`。`default_layer` の親指の `INT_HENKAN` / `INT_MUHENKAN` はこの behavior 経由で動作している。

### 2.4 既存 combo

`config/roBa.keymap` には以下の combo がある。Windows JIS での実出力ズレを §8.1 で必ず確認する。各 combo は `layers` 指定がないため、全レイヤーで発火する点に注意。

| combo 名 | bindings | 期待出力 (US 名) | Windows JIS 実出力 (予測) |
|---|---|---|---|
| `tab` | `&kp TAB` | TAB | TAB |
| `shift_tab` | `&kp LS(TAB)` | Shift+TAB | Shift+TAB |
| `muhennkann` | `&to_layer_0 INT_MUHENKAN` | 無変換 | 無変換 (default_layer 上では `to 0` は無作用) |
| `double_quotation` | `&kp DOUBLE_QUOTES` | `"` | **`*` (Shift+JIS:`:` キー相当) になる予測** |
| `eq` | `&kp EQUAL` | `=` | **`^` (US `=` HID は JIS `^` キー) になる予測** |

`DOUBLE_QUOTES` は ZMK 内部では `LS(SQT)` として展開され、US `'` の HID コードは JIS では `:` キーに対応するため、Shift 併用で `*` が出る予測。`EQUAL` も同様に HID マッピングから `^` になる予測。詳細は §7.3.1 の予測表を参照。

---

## 3. 重要な前提：roBa / ZMK と Windows JIS のズレ

### 3.1 ZMK は基本的に US HID キーコードを送る

ZMK 側の `&kp AT_SIGN` や `&kp DOUBLE_QUOTES` は、「表示文字そのもの」を送る命令ではなく、基本的には US 配列上のキー位置に対応する HID キーコードを送るものとして扱う必要がある。

一方、Windows 側のキーボードレイアウトが `日本語キーボード 106/109` になっている場合、Windows は受け取ったキーコードを JIS 配列として解釈する。

そのため、roBa 側で `@` のつもりで置いたキーが、Windows JIS 上では別の文字として入力される可能性がある。

実際、現状の `NUM` レイヤーには `&kp AT_SIGN` がそのまま使われている (`config/roBa.keymap`) ため、**この時点で潜在的な JIS 出力不具合を含む** 状態である。第 2 段階 (§7.3) で優先補正する対象。

### 3.2 Windows JIS を最優先にする

今回の主用途は Windows JIS であるため、ベースレイヤーと `NUM` レイヤーは Windows JIS での実出力を優先する。

Mac US、iPad、iPhone、Android の差分は、ベースレイヤーを崩すのではなく、補助レイヤーや運用ルールで吸収する方針とする。

### 3.3 確認が必要な記号

特に以下は実機で確認したい。HID マッピングから決定論的に予測できるズレは §7.3.1 の予測表でまとめる。

```text
@
"
'
:
;
[
]
\
|
_
=
+
~
^
`
```

---

## 4. 参照情報から反映したい点

### 4.1 Qiita 記事

参考記事：

```text
https://qiita.com/unhurried/items/837b18f568e318e4bd37
```

この記事では、ZMK / Keymap Editor が US 配列前提であることを踏まえ、JIS 配列で必要になる一部キーを直接定義している。

反映候補：

```c
#define JP_YEN          0x89
#define JP_PIPE         LS(0x89)
#define JP_UNDERSCORE   LS(0x87)
```

今回の roBa でも、Windows JIS で `\`、`|`、`_` などを安定して出したい場合、この考え方を検討する価値がある。

ただし、**ZMK 本体の `dt-bindings/zmk/keys.h` には HID International キー (`INT1` = 0x87、`INT3` = 0x89 など) や、それらに対するエイリアス (例：`INT_RO`、`INT_YEN`、`LANG1`、`LANG2` など) がすでに定義されている可能性が高い**。自前で `JP_YEN 0x89` を再定義すると、include 順や将来のヘッダ更新時に名前衝突を起こすリスクがある。

実装前に以下を確認する。

- `zmk@v0.3-branch` の `app/include/dt-bindings/zmk/keys.h` で `INT1` / `INT3` および `INT_RO` / `INT_YEN` 系のエイリアス有無
- 存在する場合は **標準名を使い、独自 `#define` は追加しない** 方針に切替える
- 存在しない場合のみ §6.1 の独自定義案を採用する

### 4.2 トラックボールスクロール

同記事では、トラックボールのスクロール切替に `hold-while-undecided` を使う方針が紹介されている。

roBa ではすでに `scroll-layers = <5>` があるため、完全な新規実装ではなく、現在の `&lt 5 I` をスクロールに向いた Hold-Tap behavior に置き換えるのが候補になる。

---

## 5. 提案方針

### 5.1 基本方針

1. `default_layer` は Windows JIS 優先で維持する。
2. `INT_HENKAN` / `INT_MUHENKAN` は残す。
3. `NUM` レイヤーの記号は Windows JIS の実出力を優先して調整する。
4. Mac / iPad / iPhone / Android 向けには、必要最小限の補助レイヤーを検討する。
5. トラックボールスクロールは、既存の `SCROLL` レイヤーを活かして実用性を上げる。
6. 既存の `layer_6` は自動リネームしない。Bluetooth / system レイヤーとして扱う。

### 5.2 Bluetooth プロファイル運用案

`layer_6` にある `BT_SEL 0` から `BT_SEL 4` は、以下のように運用上の意味を固定する。

| BT | 割り当て案 |
|---|---|
| `BT_SEL 0` | Windows JIS メイン PC |
| `BT_SEL 1` | Mac US |
| `BT_SEL 2` | iPad |
| `BT_SEL 3` | iPhone |
| `BT_SEL 4` | Android / Galaxy Z Fold6 |

この割り当て自体はファームウェア動作を変えないが、ドキュメント化と keymap-drawer 表示に反映すると運用しやすくなる。

ホスト切替の物理操作フローは以下を想定している。第 3 段階で必要なら専用 combo を追加する。

1. `&lt_to_layer_0 6 INT_HENKAN` で layer_6 に入る (現状はこのキーで遷移)。
2. layer_6 上段右側の `BT_SEL 0..4` を押す。
3. layer_6 呼び出しキーを離すと、`&mo 6` の挙動で `default_layer` に戻る。

切替頻度が高ければ、第 3 段階で「左手親指 + 右手数字行」などの combo に `bt BT_SEL n` を割り当てる案も検討する。

### 5.3 Mac / モバイル補助レイヤー案

Windows JIS のベースを崩さず、Mac / iPad / iPhone / Android で必要になりやすい操作を補助レイヤーに置く。

候補：

```text
Ctrl+Space      日本語入力切替候補 (macOS の IME 切替を Cmd+Space から Ctrl+Space に変更している場合)
Gui+Space       macOS Spotlight 候補
Gui+Tab         macOS / iPadOS のアプリ切替候補
Gui+C           コピー
Gui+V           ペースト
Gui+X           切り取り
Gui+Z           取り消し
Gui+A           全選択
GLOBE           iPadOS / iOS の言語切替・カーソル制御・絵文字 (`&kp GLOBE`)
```

ただし、最初から大きな補助レイヤーを作ると覚える量が増える。第 1 段階では `Ctrl+Space` と `Gui+C/V/X/Z/A` 程度に絞るのがよい。

`GLOBE` は iPadOS / iOS では有用な候補だが、ZMK 側のキー名が `GLOBE`、`K_GLOBE`、`LANG*` など環境や revision により異なる可能性がある。実装前に `keys.h` の定義を確認し、未定義の名前をそのまま使わない。

設計上の制約として、補助レイヤーへの遷移に `&lt_to_layer_0` 系を使う場合、既存の親指ロジック (tap で `default_layer` に戻る) を踏襲する。`&to` ベースのトグル化は §2.3 の挙動と矛盾するため避ける。

---

## 6. 実装候補

### 6.1 Windows JIS 用の直接定義

候補として、`config/roBa.keymap` の include 後に以下のような定義を追加する (ZMK 標準エイリアスが存在しない場合のフォールバック)。

```c
#define JP_YEN          0x89
#define JP_PIPE         LS(0x89)
#define JP_UNDERSCORE   LS(0x87)
```

ZMK 標準で `INT_YEN` / `INT_RO` 等のエイリアスが提供されている場合は、そちらを優先する。

```c
// 例：標準エイリアスがある場合
&kp INT_YEN        // ¥
&kp LS(INT_YEN)    // |
&kp LS(INT_RO)     // _
```

その後、`NUM` レイヤーの `\`、`|`、`_` などを実出力に合わせて置き換える。

採用前に確認したいこと：

- `zmk@v0.3-branch` の `keys.h` における `INT1` / `INT3` / `INT_RO` / `INT_YEN` 系のエイリアス有無
- 現在の `&kp BACKSLASH` が Windows JIS で何を出すか
- 現在の `&kp PIPE` が Windows JIS で何を出すか
- 現在の `&kp UNDERSCORE` が Windows JIS で何を出すか
- `JP_YEN` / `JP_PIPE` / `JP_UNDERSCORE` が roBa の ZMK バージョンで期待どおりビルドできるか
- IME のオン/オフ状態によって `Shift+ろ` (`LS(0x87)`) が `_` を直接送らずに変換候補に化ける可能性がないか (IME 直接入力モード前提であることをドキュメント化)

### 6.2 `scroll_tap` behavior の追加

現在の `&lt 5 I` を、スクロール用途に向いた独自 Hold-Tap behavior に変更する案。

候補：

```c
st: scroll_tap {
    compatible = "zmk,behavior-hold-tap";
    label = "SCROLL_TAP";
    bindings = <&mo>, <&kp>;
    #binding-cells = <2>;
    tapping-term-ms = <200>;     // 既存 &mt / lt_to_layer_0 と揃える
    quick-tap-ms = <0>;          // §6.2.3 参照: 「I を打った直後にスクロール」を阻害しないため初期値 0
    flavor = "tap-preferred";    // §6.2.1 参照
    hold-while-undecided;        // 未確定中も layer 5 を有効化 → 即スクロール
};
```

`hold-trigger-key-positions` は不要。スクロールの引き金はトラックボールの動きであり、キー位置を持たないため。

置き換え候補：

```c
&lt 5 I
```

を以下に変更する。

```c
&st 5 I
```

期待する効果：

- `I` を押してすぐトラックボールを動かしても、スクロールとして認識されやすくなる。
- 既存の `SCROLL` レイヤー番号 5 を維持できる。
- 既存のレイヤー構造への影響が小さい。

懸念：

- `I` の通常入力とスクロール切替の誤判定が増えないか。
- `tapping-term-ms = <200>` が適切か。
- `hold-while-undecided` が `zmk@v0.3-branch` で利用可能か (§7.1 の事前調査項目)。

#### 6.2.1 flavor 比較

| flavor | 挙動 | I の連打 | I 押下中の他キー入力 | 推奨度 |
|---|---|---|---|---|
| `tap-preferred` | tapping-term 経過 or 同時押し→離すで hold 確定 | 安定 | tap 優先で安全 | **推奨** |
| `balanced` | 他キー押下→離すで hold 確定 | 安定 | tap 優先で安全 | 候補 |
| `hold-preferred` | 他キー押下のみで hold 確定 | 誤爆しやすい | 直前の I が hold 化しやすい | 不採用 |

`hold-while-undecided` を併用する場合、未確定中も layer 5 が立ち上がるため「即スクロール」の体感はどの flavor でも得られる。差は **タイピング時の誤判定耐性** に出るため、既存 `&mt` (balanced) との一貫性より、誤判定の少ない `tap-preferred` を第一候補とする。実機で違和感があれば `balanced` に切替えて比較する。

なお、既存 `&mt` (LEFT_SHIFT Z) が `balanced` を採用しているのは「Z 連打時に Shift が暴発しないこと」が重視されるため。一方 `scroll_tap` (I) では「タイピング中に I が hold 化してスクロール暴発するのを避けること」が重要であり、必要な誤判定耐性の方向が異なる。よって flavor を意図的にずらす。

#### 6.2.3 `quick-tap-ms` の選定

`quick-tap-ms` は「直前の tap から N ms 以内の再押下を tap として扱う」プロパティで、連打時に hold 側へ誤って入る事故を抑える効果がある。一方で **「I を打った直後にトラックボールでスクロールしようとして I を長押し」した際、SCROLL に入らず `I` の連打になる** という副作用がある。

| 値 | 効果 | 副作用 |
|---|---|---|
| `0` (無効) | 直前 tap の影響なし。即スクロール可能 | 連打の最後の押下が hold 化するリスクが理論上残る |
| `100` | 軽い保護 | 100ms 以内の「タイプ→スクロール」遷移をブロック |
| `150` | 強めの保護 | 同上、より顕著 |

既存 `&mt` は `quick-tap-ms = <0>` (機能無効)。`scroll_tap` も初期値は `0` とし、実機で「タイピング中の SCROLL 暴発」が観測された場合のみ `100` → `150` と段階的に上げる。値の変更は §10.2 のリスクとして扱う。

#### 6.2.2 `automouse-layer` と `scroll-layers` の優先順位

`&trackball` には `automouse-layer = <4>` (MOUSE) と `scroll-layers = <5>` (SCROLL) が併設されている。`&st 5 I` で SCROLL に入った状態でトラックボールを動かしたとき、`zmk-pmw3610-driver` が以下のどちらの挙動を取るかは driver 実装依存である。

- (A) `scroll-layers` が active なら automouse をスキップしてスクロールのみ送出 (期待挙動)
- (B) automouse がトリガされて MOUSE レイヤー (4) も同時に active 化 (副作用リスク)

(B) の場合、現状 MOUSE レイヤーは右手中段 (`&mkp MB1` 等) 以外がほぼ `&trans` のため即時の事故は起きにくいが、将来 MOUSE レイヤーを充実させた際に踏むため、§7.1 で driver 側の優先ロジックを必ず確認する。

#### 6.2.4 SCROLL レイヤーのエンコーダ挙動

`default_layer` には `sensor-bindings = <&inc_dec_kp PG_UP PAGE_DOWN>` がある。`SCROLL` レイヤーには `sensor-bindings` が無いため、ZMK のフォールスルー挙動により SCROLL 中もエンコーダは PG_UP / PG_DOWN を出す。

設計判断としてのオプション:

- (a) 現状維持 (フォールスルー)。SCROLL 中もエンコーダで Page 単位スクロールが可能で、トラックボール (細かいスクロール) と用途を住み分けできる。
- (b) `SCROLL` に独自 `sensor-bindings` を追加。例: `&inc_dec_kp HOME END` や、ズーム用 `LC(EQUAL) LC(MINUS)` など。
- (c) 明示的に `&trans` を入れて意図を明確化。動作は (a) と同じだが、レビュー時に「未指定 = フォールスルー」を意識せずに済む。

**第 1 段階では (a) を採用**。動作上の混乱が起きた場合のみ (b) / (c) を検討する。本判断は §7.1.1 の事前調査に含めない (実機検証で十分な判断項目)。

### 6.3 ズーム機能は第 2 段階

トラックボールスクロールが安定した後、必要なら `Ctrl + wheel` 相当のズーム機能を検討する。

今回の第 1 段階では、通常スクロールを優先する。

---

## 7. 実施手順案

### 7.1 実装前レビュー

1. 本ドキュメントを別 AI にレビューしてもらう。
2. Windows JIS 記号補正の方針が妥当か確認する。
3. `scroll_tap` behavior の実装方法が妥当か確認する。
4. Mac / モバイル補助レイヤーを第 1 段階に含めるか、第 2 段階に送るか決める。

#### 7.1.1 事前調査項目 (実装着手前に潰す)

以下は計画段階での確認事項であり、結果次第で §6.1 / §6.2 の方針が分岐する。

1. `zmk@v0.3-branch` の `app/dts/bindings/behaviors/zmk,behavior-hold-tap.yaml` で `hold-while-undecided` プロパティが定義されているか。
   - 定義されていない場合：(a) ZMK revision の更新を別 PR で実施、(b) スクロール専用の `&mo 5` キーを別途用意する、(c) `&tog 5` や sticky layer 的な運用に変更する、のいずれかに方針変更。
2. `zmk@v0.3-branch` の `app/include/dt-bindings/zmk/keys.h` で `INT1` / `INT3` / `INT_RO` / `INT_YEN` 系のエイリアスがあるか。
   - ある場合：§6.1 の独自 `#define` は採用しない。
3. `zmk@v0.3-branch` の `app/include/dt-bindings/zmk/keys.h` で iPadOS / iOS 向けの `GLOBE` / `K_GLOBE` / `LANG*` 系キー名があるか。
   - 未定義の場合：補助レイヤーには入れず、`Ctrl+Space` など別ショートカットで代替する。
4. `kumamuk-git/zmk-pmw3610-driver` (revision: `main`) のソースで `scroll-layers` と `automouse-layer` の優先順位ロジックを確認する。
   - 期待挙動 ((A) scroll 優先) を確認できれば §6.2.2 の懸念をクローズ。
   - **`revision: main` は移動標的のため、確認時点のコミットハッシュを本計画書または実装メモに記録**しておく。Actions ビルド後の挙動が予期と違った場合、その時点で driver HEAD を再確認し原因切り分けの手掛かりにする。
   - `config/west.yml` の revision 固定は今回は行わない。AGENTS.md のルール上、west.yml 変更は明示依頼かつ別作業扱いであり、ビルド再現性のための一時固定であってもこの計画の範囲外とする。将来「ビルド再現性を恒常的に確保したい」という別の動機が生じた場合のみ、独立タスクとして driver revision 固定を検討する。

#### 7.1.2 事前調査結果 (2026-05-02)

- `zmk@v0.3-branch` の `app/dts/bindings/behaviors/zmk,behavior-hold-tap.yaml` に `hold-while-undecided` が定義されていることを確認済み。
- `zmk@v0.3-branch` の `app/include/dt-bindings/zmk/keys.h` に `INT1` / `INT_RO` / `INT3` / `INT_YEN` / `LANG1` / `LANG2` / `GLOBE` が定義されていることを確認済み。
- `kumamuk-git/zmk-pmw3610-driver` `main` の確認時点コミットは `5e04553ab803d24405bd45621a41310ea3050e59`。
- 上記 driver では `get_input_mode_for_current_layer()` が `scroll-layers` を `snipe-layers` / ball action より先に判定し、automouse 起動条件も `input_mode == MOVE` に限定されているため、SCROLL レイヤー中は scroll 優先と判断する。
- ローカル環境では `keymap` コマンド未検出。今回の `&lt 5 I` → `&st 5 I` は表示上の `I` hold = `SCROLL` を変えないため、`keymap-drawer/roBa.yaml` / `keymap-drawer/roBa.svg` は更新不要と判断する。

### 7.2 第 1 段階：最小変更

1. 当初は `config/roBa.keymap` に `scroll_tap` behavior を追加し、`default_layer` の `&lt 5 I` を `&st 5 I` に変更した。
2. 実機では `I` 長押しで `I` が連続入力され、トラックボールスクロールできなかったため、この案はいったん撤回する。
3. 次の検証案として、`I` は通常の `&kp I` に戻し、左手親指の `LEFT_ALT` 位置を専用 `&mo 5` (`SCROLL`) に変更する。
4. 必要に応じて `keymap-drawer/roBa.yaml` を更新する。**手動編集が含まれていないか差分を確認してから上書きする** (AGENTS.md の注意事項に従う)。
5. `keymap-drawer/roBa.svg` を再生成する。
6. レイヤー数、キー数、物理レイアウト、keymap-editor 表示に影響する場合のみ `config/roBa.json` (keymap-editor 用メタデータ) との整合性を確認する。
7. GitHub Actions でビルドする。
8. 左右に `.uf2` を書き込む。
9. Windows JIS で、左手親指の `SCROLL` キーを押しながらトラックボールスクロールを確認する。
10. 併走で既存 combo (`eq`、`double_quotation`) の JIS 実出力も記録する (§8.1 の検証項目に渡す)。

### 7.3 第 2 段階：Windows JIS 記号補正

HID マッピングから決定論的に予測できるズレを **予測表で補正候補として整理**し、実機で答え合わせしたうえで、確定表に基づいて補正する。

#### 7.3.1 予測される実出力ズレ表

現状の `NUM` レイヤー / 既存 combo について、US HID キーコードと JIS 配列マッピングから計算した予測値。**これは公知のマッピングに基づく予測であり、実機で必ず検証する**。

| 現状の binding | US 期待 | Windows JIS 実出力 (予測) | 備考 |
|---|---|---|---|
| `&kp AT_SIGN` | `@` | `"` | Shift+2 → JIS Shift+2 |
| `&kp PLUS` | `+` | `~` | Shift+= → JIS Shift+^ |
| `&kp UNDERSCORE` | `_` | `=` | Shift+- → JIS Shift+- |
| `&kp ASTERISK` | `*` | `(` | Shift+8 → JIS Shift+8 |
| `&kp LEFT_BRACKET` | `[` | `@` | US `[` HID = JIS `@` キー |
| `&kp RIGHT_BRACKET` | `]` | `[` | US `]` HID = JIS `[` キー |
| `&kp LEFT_BRACE` | `{` | `` ` `` | Shift+US`[` → Shift+JIS`@` |
| `&kp RIGHT_BRACE` | `}` | `{` | Shift+US`]` → Shift+JIS`[` |
| `&kp CARET` | `^` | `&` | Shift+6 → JIS Shift+6 |
| `&kp AMPERSAND` | `&` | `'` | Shift+7 → JIS Shift+7 |
| `&kp BACKSLASH` | `\` | `]` | US `\` HID = JIS `]` キー |
| `&kp PIPE` | `|` | `}` | Shift+US`\` → Shift+JIS`]` |
| `&kp EQUAL` | `=` | `^` | US `=` HID = JIS `^` キー |
| `&kp DOUBLE_QUOTES` (combo) | `"` | `*` | Shift+US`'` → Shift+JIS`:` |
| `&kp TILDE` | `~` | (要検証) | US `` ` `` HID = JIS `半角/全角` のため挙動が特殊 |
| `&kp COLON` | `:` | (要検証) | JIS `:` の HID マッピング差異あり |
| `&kp SEMICOLON` | `;` | `;` | 同一 |

特に `TILDE` (US backtick 系) は **JIS では `半角/全角` キーになる** ため、IME のオン/オフ切替が暴発する可能性がある。実機検証必須。

#### 7.3.2 補正手順

1. §7.3.1 の予測表を実機で答え合わせし、**ズレ列を修正**して確定表を作る。
2. 必要に応じて ZMK 標準の `INT_RO` / `INT_YEN` 等を使う (§4.1 / §6.1)。標準名がない場合のみ `JP_YEN` / `JP_PIPE` / `JP_UNDERSCORE` を `#define` で追加する。
3. `NUM` レイヤーの該当キーと、ズレている combo (`eq`、`double_quotation` 等) を補正する。
4. keymap-drawer を更新する。**手動編集が含まれていないか差分を確認してから上書きする**。
5. GitHub Actions でビルドする。
6. Windows JIS で再確認する (確定表の全項目)。
7. Mac US での副作用 (記号の意味が逆転していないか) を併走確認する。

### 7.4 第 3 段階：Mac / モバイル補助レイヤー

1. Mac / iPad / iPhone / Android で困る操作を洗い出す。
2. `Ctrl+Space`、`Gui+C/V/X/Z/A` などを置く補助レイヤーを検討する。
3. BT プロファイル割り当てをドキュメント化する。
4. 必要なら keymap-drawer に BT 割り当てラベルを反映する。

---

## 8. 検証項目

### 8.1 Windows JIS

- 通常の英字入力が崩れていないか。
- `INT_HENKAN` / `INT_MUHENKAN` で日本語入力切替ができるか。
- `NUM` レイヤーの数字が期待どおり入力されるか。
- `NUM` レイヤーの記号が期待どおり入力されるか。
- combo `double_quotation` (`&kp DOUBLE_QUOTES`) が `"` を出すか、別文字に化けないか。
- combo `eq` (`&kp EQUAL`) が `=` を出すか、`^` などに化けないか。
- combo `tab` / `shift_tab` / `muhennkann` が期待どおり機能するか。
- `I` 単押しで `I` が入力されるか。
- `I` 連打 (高速タイピング) で hold 側に張り付かないか。
- `I` 長押し + トラックボールでスクロールできるか。
- スクロール開始が遅すぎないか。
- 通常のマウス移動やクリックに副作用がないか。
- スクロール中に MOUSE レイヤー (4) が誤って有効化されていないか (§6.2.2 の (B) パターン検出)。

### 8.2 Mac US

- 英字入力が崩れていないか。
- 日本語入力切替候補のキーが機能するか。
- `Cmd` 系ショートカットが必要か。
- 記号入力で大きく困るものがあるか。

### 8.3 iPad / iPhone

- Bluetooth 接続が安定するか。
- 日本語入力切替が可能か (`GLOBE` キー or IME ショートカット)。
- コピー / ペーストなどの基本ショートカットが使えるか。
- トラックボール操作が期待どおり動くか。
- `&kp GLOBE` が iPadOS / iOS で言語切替・カーソル制御として認識されるか (補助レイヤーに含めた場合)。

### 8.4 Android / Galaxy Z Fold6

- Bluetooth 接続が安定するか。
- 日本語入力切替が可能か。
- トラックボール操作が期待どおり動くか。
- スクロール方向が直感と合うか。

---

## 9. 変更対象ファイル

### 9.1 第 1 段階で変更する可能性が高いファイル

```text
config/roBa.keymap
keymap-drawer/roBa.yaml
keymap-drawer/roBa.svg
config/roBa.json   # レイヤー数 / キー数 / 物理レイアウト / keymap-editor 表示に影響する場合のみ整合確認
```

### 9.2 第 2 段階以降で変更する可能性があるファイル

```text
docs/keymap-flashing-guide.md
docs/keymap-multihost-scroll-plan.md
keymap-drawer/roBa.yaml
keymap-drawer/roBa.svg
```

### 9.3 原則として変更しないファイル

```text
config/west.yml
build.yaml
boards/shields/roBa/*.overlay
boards/shields/roBa/*.dtsi
boards/shields/roBa/*.conf
zephyr/
.west/
```

今回の目的はキーマップとトラックボールスクロールの操作性改善であり、ZMK 本体、外部ドライバ、ピン配線、DeviceTree を変更する予定はない。

---

## 10. リスクと注意点

### 10.1 Windows JIS 記号補正のリスク

- keymap-drawer の表示と実際の HID キーコードが一致しにくくなる。
- Windows JIS では正しくても Mac US では別の文字になる可能性がある。
- 直接 HID 値を使う場合、将来の ZMK 変更時に見直しが必要になる可能性がある。

### 10.2 `scroll_tap` のリスク

- `I` の単押しとスクロール切替の判定が好みに合わない可能性がある。
- `tapping-term-ms` の値は実機で調整が必要になる可能性がある。
- `hold-while-undecided` の対応状況をビルドで確認する必要がある (§7.1.1 の事前調査)。
- `flavor` の選択 (`tap-preferred` vs `balanced`) で誤判定耐性に差が出るため、実機比較が必要 (§6.2.1)。
- `quick-tap-ms` を 0 より大きく設定すると、「I を打った直後にスクロール」がブロックされる体感が出る (§6.2.3)。タイピング中の SCROLL 暴発が観測された時のみ段階的に上げる。
- `scroll-layers` と `automouse-layer` の優先順位が driver 側でどう実装されているかにより、SCROLL 中に MOUSE レイヤーが副次的に active 化する可能性がある (§6.2.2)。

### 10.3 マルチホスト対応のリスク

- 1 つのキーマップで全 OS の記号入力を完全一致させるのは難しい。
- Windows JIS を最優先にするため、Mac US やモバイルでは補助レイヤーやホスト側設定が必要になる可能性がある。
- BT プロファイル割り当ては運用ルールであり、ファームウェアがホスト種別を自動判別するわけではない。

---

## 11. レビュー観点

以下の観点でレビューをお願いします。

1. **全体方針**：Windows JIS をベースに固定し、Mac / モバイルを補助レイヤーで吸収する方針は妥当か。
2. **Windows JIS 補正**：`JP_YEN` / `JP_PIPE` / `JP_UNDERSCORE` の直接定義を採用候補にするのは妥当か (ZMK 標準エイリアスがある場合はそちら優先)。
3. **検証順**：最初にスクロール改善、次に Windows JIS 記号補正、最後に Mac / モバイル補助レイヤーという順番は適切か。
4. **トラックボールスクロール**：`&lt 5 I` を `hold-while-undecided` 付きの `scroll_tap` に置き換える案は妥当か。
5. **レイヤー設計**：既存の `SCROLL` レイヤー 5 と `layer_6` を維持する方針は安全か。
6. **Mac / モバイル対応**：第 1 段階では最小限に留め、第 3 段階で補助レイヤーを検討する方針でよいか。
7. **見落とし**：ZMK、PMW3610 ドライバ、iOS / Android のキーボード挙動、Windows JIS の HID 解釈について、追加で確認すべき点はあるか。
8. **JIS 記号予測表 (§7.3.1)**：「予測表で補正候補を作る → 実機で答え合わせ → 確定表に基づいて補正する」手順は妥当か。予測表の精度に懸念はあるか。
9. **`quick-tap-ms` 設計 (§6.2.3)**：初期値 `0` で開始し、必要時のみ段階的に上げる方針は妥当か。
10. **エンコーダ設計 (§6.2.4)**：SCROLL レイヤーで `default_layer` の `sensor-bindings` をフォールスルーで使う案は妥当か。

レビュー結果を踏まえて、実装に進むか、計画をもう一度修正する。

---

## 12. レビュー履歴

### 12.1 一次レビュー反映 (Claude Code Opus)

本計画書は別 AI による一次レビューを受け、以下を反映済み。

- §2.2: `&lt` のデフォルト flavor が `tap-preferred` であり、トラックボール移動では hold 確定しない理由を明記。
- §2.3: 既存の `to_layer_0` macro / `lt_to_layer_0` behavior の存在と、補助レイヤー設計でこれらの戻り挙動を踏襲する前提を明記。
- §2.4: 既存 combo (`eq`、`double_quotation` ほか) を表で整理し、JIS 出力ズレの検証対象として明示。
- §4.1 / §6.1: ZMK 標準の `INT1` / `INT3` / `INT_RO` / `INT_YEN` 系エイリアスを優先する方針を追加。独自 `#define` はフォールバック扱い。
- §5.2: BT プロファイル切替の物理操作フローを明記。
- §5.3: `GLOBE` キーを iPad / iOS 用補助レイヤー候補に追加。補助レイヤーの戻り挙動制約を追記。
- §6.2: `scroll_tap` 候補の `flavor` を `tap-preferred` に変更、`quick-tap-ms` を追加。`hold-trigger-key-positions` 不要の理由を明記。
- §6.2.1: flavor 比較表を追加。
- §6.2.2: `scroll-layers` と `automouse-layer` の優先順位に関する driver 依存リスクを追加。
- §7.1.1: 実装前の事前調査項目 3 件を明示 (hold-while-undecided 対応 / 標準エイリアス有無 / driver 優先順位)。
- §7.2: `keymap-drawer/roBa.yaml` の手動編集確認、`config/roBa.json` の整合確認、combo 出力記録を手順に追加。
- §8.1: 既存 combo の JIS 出力検証、`I` 連打耐性、SCROLL 中の MOUSE レイヤー副次活性チェックを追加。
- §8.3: iPad / iPhone での `GLOBE` キー検証を追加。
- §9.1: `config/roBa.json` を変更候補に追加。
- §10.2: flavor 選択リスクと driver 優先順位リスクを追加。

### 12.2 二次レビュー反映 (Codex)

一次レビュー反映後、Codex による二次レビューを受け、以下を反映済み。

- §5.2: `BT_SEL` 後に `to_layer_0` 経由で戻るという表現を修正。実際には layer_6 呼び出しキーを離すと `&mo 6` の挙動で `default_layer` に戻る。
- §5.3 / §7.1.1: `GLOBE` キーは未定義の可能性があるため、実装前に `GLOBE` / `K_GLOBE` / `LANG*` 系キー名を `keys.h` で確認する項目を追加。
- §7.1.1: `hold-while-undecided` が使えない場合の代替案から、即スクロールの直接解決にならない `require-prior-idle-ms` を削除。専用 `&mo 5`、`&tog 5`、sticky layer 的運用を代替案に変更。
- §9.1: `config/roBa.json` の確認条件を「レイヤー数 / キー数 / 物理レイアウト / keymap-editor 表示に影響する場合」に限定。

### 12.3 三次レビュー反映 (Claude Code Opus)

二次レビュー反映後、Claude Code Opus による三次レビューを受け、以下を反映済み。

- §2.4 / §3.1: combo `double_quotation` の予測値を「`2` 系」から「`*` (Shift+JIS:`:` キー相当)」に修正。`&kp AT_SIGN` が現状 `NUM` レイヤーに含まれており潜在バグであることを §3.1 に明記。combo の `layers` 未指定 (= 全レイヤー発火) の注意を追記。
- §3.3 / §7.3 / §7.3.1: 実機検証だけに頼らず、HID マッピングから決定論的に予測できるズレを **予測表** で補正候補として整理し、実機で答え合わせしてから確定表に基づいて補正する手順に変更。`AT_SIGN` / `LEFT_BRACKET` / `UNDERSCORE` / `PLUS` / `EQUAL` / `DOUBLE_QUOTES` 等の予測値を §7.3.1 に明記。
- §6.2 / §6.2.3: `quick-tap-ms` の初期値を `<150>` から `<0>` に変更。理由 (「タイプ→即スクロール」を阻害しない / 既存 `&mt` と整合) を §6.2.3 で説明し、段階的調整方針を明記。
- §6.2.1: `&mt` (LEFT_SHIFT Z) と `scroll_tap` (I) で flavor を意図的にずらす理由を補足。
- §6.2.4: SCROLL レイヤーの `sensor-bindings` 設計判断 (フォールスルー / 独自 / 明示 trans) を新規節として追加。第 1 段階はフォールスルー採用。
- §7.1.1 item 4: `zmk-pmw3610-driver` の `revision: main` が移動標的である点を明記。確認時のコミットハッシュ記録を運用ルールに追加。
- §10.2: `quick-tap-ms` 副作用をリスクとして追記。
- §11: 三次レビュー後の追加論点 (8: JIS 予測表、9: quick-tap-ms 設計、10: エンコーダ設計) を追加。
- 構成変更: §10.4 / §10.5 (レビュー履歴) を §10 リスク配下から独立させ、§12 「レビュー履歴」に再配置。

### 12.4 四次レビュー反映

三次レビュー反映後、四次レビューを受け、以下を反映済み。

- §7.1.1 item 4: `config/west.yml` を確認時点のコミットに一時固定する案を撤回。AGENTS.md の「west revision 変更は明示依頼かつ別作業」ルールと矛盾するため、計画範囲では **コミットハッシュの記録のみ** に留める方針へ変更。Actions ビルド後に挙動が想定と違った場合のみ driver HEAD を再確認する運用とし、ビルド再現性を恒常的に確保したい場合は将来の独立タスクとして検討する旨を明記。
