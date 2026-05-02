# エージェント設定ファイル整備プラン — レビュー依頼ドキュメント

> このドキュメントは、別の AI レビュアーが**前提知識ゼロ**でレビューできるように自己完結的に書かれています。
> レビュアーへ：末尾の「レビュー観点」に沿って、賛否・代替案・見落としを指摘してください。

---

## 0. レビュー依頼の目的

`zmk-config-roBa` プロジェクトにおいて、複数の AI コーディングエージェントが一貫したルールで動くように、ガイドライン文書群（`AGENTS.md`、`CLAUDE.md`、Cursor rules）を整備したい。本ドキュメントは**実装前のプランレビュー用**で、まだファイルは作成していない。

---

## 1. プロジェクト背景

### 1.1 対象プロジェクト

- **リポジトリ名**：`zmk-config-roBa`
- **対象ハードウェア**：roBa — 自作分割キーボード
  - MCU：`seeeduino_xiao_ble`（nRF52840）
  - 右手側にトラックボール（PMW3610 センサ）
  - 左手側にエンコーダ搭載
- **ファームウェア**：[ZMK Firmware](https://zmk.dev/)（`v0.3-branch` を参照）
- **追加ドライバ**：`kumamuk-git/zmk-pmw3610-driver`（トラックボール用）
- **ビルド**：GitHub Actions（`build.yaml` のマトリクスで `roBa_L` / `roBa_R` / `settings_reset` をビルド）

### 1.2 リポジトリ構成（現状）

```
zmk-config-roBa/
├── README.md                       # 現状ほぼ空（keymap SVG 埋め込みのみ）
├── build.yaml                      # GitHub Actions マトリクス
├── config/
│   ├── roBa.json                   # keymap-editor 用メタ
│   ├── roBa.keymap                 # ★キーマップ本体（編集の中心）
│   └── west.yml                    # ZMK 依存定義
├── boards/shields/roBa/
│   ├── Kconfig.defconfig
│   ├── Kconfig.shield
│   ├── roBa.dtsi                   # 共通 DeviceTree
│   ├── roBa.zmk.yml                # シールドメタ
│   ├── roBa_L.conf / roBa_L.overlay  # 左手（エンコーダ側）
│   └── roBa_R.conf / roBa_R.overlay  # 右手（トラックボール / PMW3610 / SPI 側）
├── keymap-drawer/
│   ├── roBa.yaml                   # keymap-drawer 設定
│   └── roBa.svg                    # ★自動生成キーマップ図
└── zephyr/                         # Zephyr モジュール定義（基本触らない）
```

### 1.3 利用エージェント

ユーザーは **Cursor（IDE）をベース**に、その拡張機能経由で以下を併用する：

| エージェント | 公式の規約ファイル | 備考 |
|---|---|---|
| **OpenAI Codex CLI** | `AGENTS.md` | 共通仕様。Cursor / Aider 等も参照 |
| **Claude Code**（VSCode 拡張） | `CLAUDE.md` | Anthropic 公式の規約 |
| **Cursor**（IDE 本体） | `.cursor/rules/*.mdc` | globs / always 適用が選べる |

---

## 2. 設計方針（提案）

### 2.1 基本コンセプト：**Single Source of Truth + 薄いブリッジ**

- `AGENTS.md` を**真実の源**とし、プロジェクト固有のルールはすべてここに集約。
- `CLAUDE.md` と `.cursor/rules/` は**「作業開始時に AGENTS.md を読む」+「プロジェクトルールの矛盾時は AGENTS.md を優先」+ 各ツール固有の差分のみ**を持つ薄いファイルにする。
- **プロジェクトルール**（編集対象、コミット粒度、左右役割など）の真実の源は `AGENTS.md`。**ツール固有の振る舞い**（Claude Code のメモリ/import、Cursor rules の frontmatter、シェル実行時の注意など）は各ブリッジファイルを正とする。
- 重複を避ける理由：キーマップ慣例などが3箇所に分散すると、片方の更新漏れで矛盾が起きるため。

### 2.2 採用するファイル構成

```
zmk-config-roBa/
├── AGENTS.md                          # ★真実の源（Codex CLI が読む共通仕様）
├── CLAUDE.md                          # Claude Code 用の薄いブリッジ
└── .cursor/
    └── rules/
        ├── project.mdc                # 常時適用：@AGENTS.md 参照 + Cursor 固有
        └── zmk-keymap.mdc             # globs: config/*.keymap 適用：DSL ヒント
```

### 2.3 各ファイルの内容方針

#### `AGENTS.md`（メインドキュメント）

- **応答言語**：日本語（ユーザー指定）
- **プロジェクト概要**：1.1 / 1.2 の要約
- **左右の役割**：
  - 物理的には `roBa_L` が左手側エンコーダ、`roBa_R` が右手側トラックボール（PMW3610 / SPI）を担当。
  - Kconfig フラグと物理配置は別軸。`CONFIG_EC11` と `CONFIG_ZMK_POINTING` は両側 `.conf` に存在するため、「片側にしかハードウェアがない = Kconfig も片側だけ」と決めつけて削除しない。
  - ZMK Studio は `roBa_R` 側で有効。`build.yaml` の `snippet: studio-rpc-usb-uart` と `roBa_R.conf` の `CONFIG_ZMK_STUDIO=y` / `CONFIG_ZMK_STUDIO_LOCKING=n` をセットで扱う。
- **ディレクトリの役割と編集頻度**：
  - 高頻度：`config/roBa.keymap`、`keymap-drawer/roBa.yaml`
  - 中頻度：`boards/shields/roBa/*.conf`、`*.overlay`
  - 低頻度：`build.yaml`、`config/west.yml`、`*.dtsi`
  - 触らない：`zephyr/`、`.west/`、`boards/shields/roBa/Kconfig.*`（理由がなければ）
- **作業フロー**：
  1. `roBa.keymap` を編集
  2. `keymap-drawer/roBa.yaml` も同期更新（必要なら）
  3. 表示に影響する keymap 変更では `keymap-drawer` で SVG 再生成 → `roBa.svg` をコミット
     - 例：
       ```bash
       keymap parse -c 10 -z config/roBa.keymap > keymap-drawer/roBa.yaml
       keymap draw keymap-drawer/roBa.yaml > keymap-drawer/roBa.svg
       ```
     - ただし `roBa.yaml` に手調整がある可能性があるため、上書き前後の差分を確認する。
  4. ローカルでは実機ビルドせず、push 後 GitHub Actions のビルド成功を確認
  5. Actions 成功後に Artifacts の `.uf2` を実機に書き込む
- **コーディング/編集慣例**（推奨ルール — 3 に詳述）
- **コミット/PR ルール**：
  - コミットメッセージは英語または日本語、変更理由を必ず含める
  - 表示に影響する keymap 変更コミットには SVG 更新も同梱
  - `.conf` の物理的変更（センサ感度など）は実機検証が前提と明記
- **やってはいけないこと**：
  - 勝手に west.yml の revision を上げない
  - 外部ドライバ（例：`zmk-pmw3610-driver`）の revision 変更を他の変更と混ぜない
  - `zephyr/`、`.west/` 配下を編集しない
  - 検証していない `.overlay` の DT 変更を「動くはず」で push しない
- **環境前提**：Windows + PowerShell、Git は WSL ではなくネイティブ

#### `CLAUDE.md`

- 冒頭に `@AGENTS.md` を置き、Claude Code の import 機能でプロジェクトルールを読み込ませる。
- その上で「プロジェクトルールは `AGENTS.md` を優先。Claude Code 固有の振る舞いはこの `CLAUDE.md` を優先」と明記。
- Claude Code 固有の差分のみ：
  - 応答言語：日本語
  - シェル：PowerShell（`$null`、`$env:VAR`、`;` チェイン等）
  - `git` 操作時に `cd` を使わない
  - スキル利用方針（必要に応じて）

#### `.cursor/rules/project.mdc`（常時適用、`alwaysApply: true`）

- Cursor rules の frontmatter を使い、`alwaysApply: true` にする。
- 本文に `@AGENTS.md` を置き、Cursor の参照ファイル機能でプロジェクトルールを含める。
- 「プロジェクトルールは `AGENTS.md` を優先。Cursor 固有の振る舞いはこの rule を優先」と明記。
- Cursor の Composer/Chat 固有：日本語応答、PowerShell 前提

#### `.cursor/rules/zmk-keymap.mdc`（`globs: config/*.keymap`）

- `alwaysApply: false` とし、keymap 編集時だけ自動適用する。
- ZMK の keymap DSL の構文ヒント
- behaviors（`&kp`、`&mt`、`&lt`、`&mo`、`&to`、`&trans`、`&none`）の意味
- レイヤー定義の慣例
- ホールドタップ・コンボ・マクロの典型パターン

---

## 3. 推奨する追加ルール（ユーザーから「お勧めしてください」依頼分）

ユーザーから「現状特にないが、お勧めがあれば」と依頼されたため、ZMK 設定リポジトリで一般的に有効な慣例を提案する。

### 3.1 キーマップ編集

1. **新規レイヤー名は意図がわかる名前**を使う（`default_layer`、`lower`、`raise`、`adjust`、`mouse` 等）。既存の番号レイヤー（例：現状の `layer_6`）は、意味と影響を確認してから改名する。
2. **新しい behavior 定義時はコメントで意図を残す**（特にホールドタップのタイミングパラメータは「なぜこの値か」を1行）。
3. **表示に影響するキーマップ変更時は `keymap-drawer/roBa.yaml` と `roBa.svg` を一緒に更新**してコミットする（PR の差分が一目でわかる）。
4. **コンボ・マクロは別セクションにまとめる**。インライン定義は読みづらい。

### 3.2 設定ファイル（`.conf`）

5. **`.conf` の非自明な値に短いコメント**（特にセンサ DPI、スリープ時間、消費電力、通信挙動関連）。実機検証で値を変えるとき、過去の試行値が分かると助かる。自明な設定にまでコメントを強制しない。
6. **L/R の共通設定と片側固有設定を区別する**。`CONFIG_ZMK_BATTERY_REPORTING` や `CONFIG_ZMK_SPLIT_*` など共通であるべき設定は両側で揃える。一方、PMW3610、SPI、ZMK Studio、エンコーダなど片側固有の設定は勝手に対称化しない。片側だけ変更したときは PR 説明にその意図を書く。

### 3.3 DeviceTree（`.overlay` / `.dtsi`）

7. **DT 変更は必ず Actions のビルド成功を確認してから merge**。ビルドエラーは ZMK の DT パーサで頻発する。
8. **ピン番号変更はハードウェア配線変更とセット**。コードだけ変えない。

### 3.4 依存・ビルド

9. **`config/west.yml` の `revision` 変更は単独 PR**。ZMK 本体だけでなく `zmk-pmw3610-driver` 等の外部ドライバ更新も他の変更と混ぜない（破壊的変更時のロールバックを容易にするため）。
10. **`build.yaml` の include 配列の順序を維持**（差分レビューのノイズを減らす）。現状では `roBa_R` のみ `snippet: studio-rpc-usb-uart` を持つため、左右対称化目的で安易に削除・移動しない。

### 3.5 コミット粒度

11. **「キーマップ変更」「設定変更」「シールド定義変更」はコミットを分ける**。bisect しやすい。

これらは「強制」ではなく「推奨」として `AGENTS.md` に書く想定。ユーザーが採用しないものは削除可。

### 3.6 AI エージェントが踏みがちな落とし穴

12. **左右の物理ハードウェアと Kconfig フラグは別軸**。物理的には `roBa_R` がトラックボール（PMW3610 / SPI）側、`roBa_L` がエンコーダ側。ただし `CONFIG_EC11` と `CONFIG_ZMK_POINTING` は両 conf に存在するため、「片側にしかハードウェアがない = Kconfig も片側だけ」と決めつけて削除しない。
13. **ZMK Studio / USB UART 用設定を消さない**。`build.yaml` の `roBa_R` に付いている `studio-rpc-usb-uart` と、`roBa_R.conf` の `CONFIG_ZMK_STUDIO=y` / `CONFIG_ZMK_STUDIO_LOCKING=n` は Studio 動作の前提として扱う。
14. **既存の番号レイヤーを自動改名しない**。keymap-drawer 表示、`&lt` / `&mo` / カスタム behavior の参照先に影響するため、改名は別作業で行う。
15. **DeviceTree のピン・SPI・センサ設定変更は実機配線とセットで扱う**。ビルド成功は最低条件であり、実機挙動の保証ではない。
16. **`config/roBa.json` は keymap-editor 用メタ**。`roBa.keymap` や keymap-drawer と二重管理になりうるため、レイアウトやキー数に関わる変更時は整合性を確認する。

---

## 4. 代替案・トレードオフ

### 4.1 「全部 CLAUDE.md に書く」案

- メリット：Claude Code 単体ならシンプル
- デメリット：Codex / Cursor が読まない。マルチエージェント前提に反する
- → **不採用**

### 4.2 「シンボリックリンクで AGENTS.md = CLAUDE.md」案

- メリット：完全な単一ファイル
- デメリット：Windows 環境ではシンボリックリンク権限が面倒。Claude Code 固有の差分（PowerShell 注意など）が書けない
- → **不採用**

### 4.3 「`.cursor/rules/` は作らず Cursor も AGENTS.md を読ませる」案

- Cursor は `AGENTS.md` も自動で読むため理論上は可能
- ただし `globs` での自動コンテキスト注入（keymap 編集時のみ DSL ヒントを出す等）が使えなくなる
- → **`.cursor/rules/` は作る方針**

補足：`.cursor/rules/zmk-keymap.mdc` は常時適用ではなく `globs: config/*.keymap` に限定する。ZMK keymap 編集時だけ DSL ヒントを注入し、通常の Markdown / 設定ファイル編集時には過剰なコンテキストを避ける。

将来 keymap ファイルが `config/` 直下以外へ移動する場合は、`globs: **/*.keymap` への変更を検討する。現状は `config/roBa.keymap` 固定なので `config/*.keymap` で十分。

---

## 5. 実装の進め方（提案）

1. `AGENTS.md` をドラフト → ユーザー確認
2. `CLAUDE.md` を薄く作成
3. `.cursor/rules/project.mdc` と `zmk-keymap.mdc` を作成
4. `README.md` の冒頭に「エージェント向けドキュメント参照」の一行を追加（任意）
5. Codex / Claude Code / Cursor で、それぞれ想定どおり `AGENTS.md` またはブリッジファイルが読まれるか確認
   - 各エージェントに「このリポジトリの最重要ルールを3つ挙げて」と質問する。
   - 左右の物理役割と Kconfig の注意、`west.yml` / 外部ドライバ revision を勝手に上げないこと、表示に影響する keymap 変更では SVG も更新すること、などが返れば読み込み成功とみなす。
   - Claude Code では `/memory` で `CLAUDE.md` と import された `AGENTS.md` が読まれているか確認する。
   - Cursor では Agent sidebar / Rules 表示で `project.mdc` と、keymap 参照時の `zmk-keymap.mdc` 適用を確認する。
6. ZMK 本体、`zmk-pmw3610-driver`、keymap-editor / keymap-drawer 周辺を大きく更新した場合は、`AGENTS.md` の前提も見直す。

---

## 6. レビュー観点（レビュアーへの依頼事項）

以下の観点でレビューをお願いします。

1. **構成の妥当性**：`AGENTS.md` を真実の源とし、`CLAUDE.md` と `.cursor/rules/` をブリッジにする方針は適切か？ もっと良い分割があるか？
2. **重複の最小化**：ブリッジファイルから `@AGENTS.md` を参照する方針で、各ツールが期待通り読み込むか？ Claude Code / Cursor それぞれの import・参照仕様に沿っているか？
3. **推奨ルール（セクション3）**：ZMK プロジェクトとして妥当か？ 不要なもの・追加すべきものは？
4. **Windows + PowerShell 前提**：シェル前提を `AGENTS.md` 側に書くべきか、各ブリッジに書くべきか？
5. **抜け漏れ**：このプロジェクトで AI が踏みがちな落とし穴で、ルール化すべきもの（例：ZMK の DT 構文、behavior の名前空間衝突、ビルドキャッシュの扱いなど）はあるか？
6. **`.cursor/rules/zmk-keymap.mdc`**：keymap DSL のヒントを Cursor に常時注入するのは過剰か、適切か？
7. **メンテナンス性**：このルール群が陳腐化したとき、誰がどう更新すべきか（運用面）について追記すべきか？

レビュー結果を踏まえて実装に進みます。

---

## 7. 再レビュー結果（Claude による Codex 修正後の再レビュー）

> このセクションは、Codex による初回レビューの修正版（セクション 1〜6）に対し、Claude が実ファイル（`config/`、`boards/shields/roBa/*.conf`、`*.overlay`）を確認した上で行った再レビューの結果です。
> Codex による再々レビューを依頼します。各指摘について、賛否・代替案・追加見落としを返してください。

### 7.1 事実関係の指摘（要修正）

#### 7.1.A セクション 3.6 #12 の左右ルールが単純化しすぎ ⚠️

実際の `.conf` を確認した結果、**ハードウェアと Kconfig は別軸**：

| ファイル | ハードウェア | Kconfig（抜粋） |
|---|---|---|
| `roBa_L.conf` | エンコーダのみ | `CONFIG_EC11=y` **かつ** `CONFIG_ZMK_POINTING=y` |
| `roBa_R.conf` | トラックボールのみ | `CONFIG_EC11=y` **かつ** `CONFIG_ZMK_POINTING=y` + `CONFIG_PMW3610=y` 各種 + `CONFIG_ZMK_STUDIO=y` |

`CONFIG_EC11` と `CONFIG_ZMK_POINTING` は**両側に存在**する（分割キーボードでセントラル側がペリフェラル入力を受け取るために必要）。

「`roBa_R` がトラックボール側、`roBa_L` がエンコーダ側」は**物理レイアウトの事実**としては正しいが、**Kconfig フラグの存在 = ハードウェア配置ではない**ことを 3.6 #12 に補足しないと、AI が「L には POINTING 不要だから消そう」と誤判断する恐れがある。

**修正案**：3.6 #12 を以下に置き換え。

> 12. **左右の物理ハードウェアと Kconfig フラグは別軸**。物理的には `roBa_R`=トラックボール（PMW3610）、`roBa_L`=エンコーダ。ただし `CONFIG_EC11` と `CONFIG_ZMK_POINTING` は分割キーボードのセントラル側受信のため両 conf に存在する。「片側にしかハードウェアがない＝Kconfig も片側だけ」と決めつけて削除しない。

#### 7.1.B ZMK Studio の所在が build.yaml 経由でしか書かれていない

実際は `roBa_R.conf` に `CONFIG_ZMK_STUDIO=y` と `CONFIG_ZMK_STUDIO_LOCKING=n` が入っている。3.6 #13 の「Studio / USB UART snippet」は `.conf` 側の Kconfig も含めて言及すべき。

**修正案**：3.6 #13 に「`roBa_R.conf` の `CONFIG_ZMK_STUDIO=y` / `CONFIG_ZMK_STUDIO_LOCKING=n` も Studio 動作の前提。snippet と合わせて意図を保つ」を追記。

#### 7.1.C `keymap-drawer` 同期の具体手順が未記載

ワークフロー（2.3 → 作業フロー 2-3）で「`roBa.yaml` も同期更新」「SVG 再生成」とあるが、**具体コマンドがない**。AI が独自手順を発明するリスクあり。

**修正案**：作業フローに以下のような具体コマンドを記載するか、`keymap-drawer` 公式ドキュメントへのリンクを置く。前提（`pip install keymap-drawer` 済みか）も明記。

```bash
# 例（実際のリポジトリ運用に合わせて要調整）
keymap parse -c 10 -z config/roBa.keymap > keymap-drawer/roBa.yaml
keymap draw keymap-drawer/roBa.yaml > keymap-drawer/roBa.svg
```

---

### 7.2 設計上の改善提案

#### 7.2.A 「優先順位」を二層化すべき

現在「矛盾時は `AGENTS.md` を優先」と書いているが、これだと**ツール固有の正しい挙動まで AGENTS.md に上書きされる**懸念がある。例：

- `AGENTS.md`：「シェルは PowerShell」（プロジェクト事実）
- `CLAUDE.md`：「`$null`、`;` チェイン等」（Claude Code が間違えやすい構文の注意）

これらは矛盾ではなく階層関係なので、明示すると安全：

> - **プロジェクトルール**（編集対象、コミット粒度、左右役割など）の真実の源は `AGENTS.md`
> - **ツール固有の振る舞い**（シェル構文、IDE 機能の使い分け）は各ブリッジファイルが正

**修正案**：2.1 を「矛盾時は AGENTS.md 優先」から「**プロジェクトルールの矛盾時**は AGENTS.md 優先。**ツール固有の振る舞い**は各ブリッジファイル（CLAUDE.md / `.cursor/rules/`）が正」に変更。

#### 7.2.B セクション 3.2 #6「L/R 対称ルール」が現状と矛盾気味

現状 `roBa_L.conf` / `roBa_R.conf` は**意図的に非対称**（PMW3610 系、Studio は R のみ）。ルールを以下に分けると安全：

- **共通であるべき設定**（`CONFIG_ZMK_BATTERY_REPORTING`、`CONFIG_ZMK_SPLIT_*` など）：両側で揃える
- **片側固有設定**（センサ、Studio、エンコーダ周り）：勝手に対称化しない

これは 3.4 #10 の「片側固有設定は維持」と内容が被るので、**統合して一箇所**に書く方がメンテしやすい。

**修正案**：3.2 #6 と 3.4 #10 を統合し、「対称であるべき項目」と「片側固有項目」のリストを `AGENTS.md` 側に明記。

#### 7.2.C `.cursor/rules/zmk-keymap.mdc` の glob を堅牢に

`globs: config/*.keymap` ではなく `globs: **/*.keymap` を推奨。将来 keymap ファイルがサブディレクトリに移動しても効く（このリポジトリでは `config/` 直下固定なので影響なしだが、保険）。

#### 7.2.D セクション 5 ステップ 5「検証」が抽象的

「想定どおり読まれるか確認」だけでは、ユーザーが何をすればよいか不明。

**修正案**：

> 各エージェントで「`AGENTS.md` の最重要ルールを 3 つ挙げて」と質問し、左右役割・west.yml ロック・SVG 同梱コミットなどが返ってくれば読み込み成功と判定。Claude Code は `/memory` 相当でもチェック可能（要確認）。

---

### 7.3 追加すべき項目（小粒）

| # | 追加先 | 内容 |
|---|---|---|
| 7.3.A | AGENTS.md コミットルール | コミットメッセージ言語のデフォルトを明示（既存ログは英語/日本語混在 → どちらでも可と思うが明文化） |
| 7.3.B | AGENTS.md 作業フロー | `keymap-drawer` の具体コマンド or `pip install keymap-drawer` の前提（7.1.C と連動） |
| 7.3.C | 3.6 落とし穴 | 「`config/roBa.json` は keymap-editor 用メタ。`roBa.keymap` と二重管理になりうる点に注意」 |
| 7.3.D | レビュー観点 #7 への回答案 | 運用面：ZMK 本体や `zmk-pmw3610-driver` の大型更新時に `AGENTS.md` の追従要否をチェックする運用ルールを追記 |

---

### 7.4 良くなった点（Codex の初回レビューで評価）

- ✅ 1.1 で左右ハードウェア役割を明記（事実として正確）
- ✅ 2.1「矛盾時の優先順位」概念導入（7.2.A で更に詳細化を提案）
- ✅ 作業フロー 3「表示に影響する場合」条件付け（無駄な SVG 再生成を回避）
- ✅ 3.1 #1「既存 layer_6 は確認後に改名」（破壊的改名の防止）
- ✅ 3.6 セクション新設（AI 落とし穴の明文化）
- ✅ 3.4 #9 で外部ドライバ revision にも言及
- ✅ 3.4 #10 で `studio-rpc-usb-uart` snippet の意図保護
- ✅ セクション 5 ステップ 5（検証フェーズ追加）

---

### 7.5 再レビューの結論

**全体方針は妥当。実装に進める段階**。ただし以下を反映してから `AGENTS.md` ドラフトに進むのを推奨：

- **必須**：7.1.A（左右 Kconfig の事実訂正）、7.1.C（keymap-drawer の具体手順）
- **強く推奨**：7.2.A（優先順位二層化）、7.2.B（L/R ルール統合）
- **任意**：7.1.B、7.2.C、7.2.D、7.3.A〜7.3.D

---

## 8. Codex 再々レビューへの依頼事項

セクション 7 の各指摘について、以下を返してください：

1. **賛否**：採用 / 却下 / 一部採用、その理由
2. **代替案**：別解があれば
3. **追加見落とし**：Claude が見落とした論点（特に Codex CLI 視点での `AGENTS.md` 仕様準拠、Cursor `.mdc` フロントマター仕様、ZMK のベストプラクティスなど）
4. **実装着手判断**：このまま `AGENTS.md` 起こしに進んで良いか、もう一往復必要か
