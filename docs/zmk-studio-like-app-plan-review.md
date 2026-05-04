# `zmk-studio-like-app-plan.md` レビュー結果

レビュー対象: [docs/zmk-studio-like-app-plan.md](zmk-studio-like-app-plan.md)
レビュー日: 2026-05-04
レビュー前提: **配布せず個人利用**（Windows + PowerShell 環境）
このレビュー結果は codex による再レビューを想定して記載しています。

---

## 全体評価

- **方向性**: 「直接反映を後回しにして、まず読み取り・表示・Markdown 出力・ローカル編集を作る」という段階分けは妥当。直接反映の調査が難航しても価値が出る順序になっている。
- **致命的な穴**: 既存ツール調査が Phase 0 から抜けており、「車輪の再発明」リスクの評価ができていない。MVP 着手前に必ず埋めるべき。
- **詰めが甘い箇所**: devicetree 編集の難しさ、データモデルのネスト binding 対応、Phase 4 と既存 ZMK Studio クライアントとの関係。
- **個人利用前提による変化**: 配布・署名・ライセンス互換などの論点が不要になり、技術選定（Electron vs Web）と Phase 4 の必然性が大きく下がる。

---

## 重要な指摘

### 1. 既存ツールの評価が Phase 0 に入っていない（最重要）

リポジトリには [config/roBa.json](../config/roBa.json) が存在し、AGENTS.md には「keymap-editor メタデータ」と書かれている。つまり **Nick Coutsos の keymap-editor 用ファイルが既に存在**しているのに、計画書はその評価に触れていない。

少なくとも以下を Phase 0 で比較評価すべき。

- **keymap-editor** (https://github.com/nickcoutsos/keymap-editor)
  - Web UI で ZMK keymap を視覚編集
  - GitHub 連携前提だがローカル運用も可能
  - `.keymap` のパースと再書き出しを既に実装している
  - → 自作する前に「これに roBa の物理レイアウト定義と Markdown 出力と Windows JIS 補正を足すだけで要求を満たせるのでは？」という検討が必要
- **ZMK Studio 公式 Web クライアント**
  - roBa_R ですでに `CONFIG_ZMK_STUDIO=y` が有効
  - Phase 4 の「直接反映」は公式クライアントで既に実現できているので、自作で何を上乗せするのか明文化が必要
- **Vial / VIA**
  - QMK 系だが UI 設計の参考

個人利用前提なら fork や組み合わせの自由度が高いため、**「keymap-editor を fork して roBa 専用化 + Windows JIS 補正 + Markdown 出力を追加する」選択肢**が最も現実的に見える。Phase 0 成果物に「fork するか自作するかの判断」を明示すべき。

### 2. 技術選定: 個人利用なら Web アプリ優先が合理的

[docs/zmk-studio-like-app-plan.md:55-70](zmk-studio-like-app-plan.md#L55-L70) で Electron + React を推奨しているが、配布しない前提では以下の方が合致する。

- Phase 1 の「読み取り・表示・Markdown 出力」は **File System Access API** で十分（Chrome / Edge で `.keymap` の読み書きが可能）
- Phase 2 のローカル編集も同じ範囲
- デバイス通信が必要になるのは Phase 4 のみ
- Web Serial / Web HID で ZMK Studio RPC を扱える可能性があり、Phase 4 まで Web で行ける可能性がある（公式 Studio クライアントがまさにそれ）

個人利用なら Electron のビルド・パッケージング設定が丸ごと不要になるため、**「ローカル Web アプリ（Vite + React）→ 必要になったら Electron 移行」** の二段構えが初動を最も軽くする。

### 3. devicetree 編集リスクへの対策が薄い

[docs/zmk-studio-like-app-plan.md:309-319](zmk-studio-like-app-plan.md#L309-L319) の対策が「bindings 限定」「コメント保持」「差分表示」止まりで、具体的なパーサ戦略がない。

論点:

- ZMK の `.keymap` は C プリプロセッサ通過後に devicetree として解釈される。`#include`、`#define`、マクロ展開を含むファイルを **AST 編集して再シリアライズする手段は自明ではない**。
- keymap-editor は内部で独自パーサを持っているはず。これを再利用するか、参考にするかを決めないと Phase 2 で詰む。
- 「bindings ブロックの位置のみを書き換える」アプローチは、`&mt LSHIFT A` のような複合バインディングや、マクロ参照（`&macro_xxx`）が存在すると、文字列範囲特定だけで壊れやすい。

→ Phase 0 の成果物に **「`.keymap` 編集戦略の選定（既存パーサ流用 / 部分置換 / フル再生成）」** を追加すべき。個人利用でも自分の `.keymap` が壊れる痛みは同じ。

### 4. データモデルがネスト binding を扱えるか不明

[docs/zmk-studio-like-app-plan.md:274-306](zmk-studio-like-app-plan.md#L274-L306) の `KeyBinding.params: string[]` だと、以下のケースの表現が曖昧。

- `&mt LSHIFT A` → `params: ["LSHIFT", "A"]` でよいが、片方は modifier、片方は keycode という型情報が落ちる
- `&lt 1 SPACE` → `params: ["1", "SPACE"]`、layer 番号と keycode が混ざる
- `&macro_xxx` 経由のキー → params に macro 引数を入れるのか、macro 定義側に飛ばすのか
- combo の binding（`&kp AT_SIGN` など）と通常 binding の型は同じか

`editableDirectly` / `requiresBuild` の **判定ルールも書かれていない**（既存 layer の position に対する `&kp` 差し替えは Direct、新規 behavior 追加は Build、では combo position 変更は？など）。

→ データモデルに `bindingKind: "kp" | "mt" | "lt" | "mo" | "macro" | "combo" | ...` のような discriminator を入れる、または `params: BindingParam[]` で型情報を残すべき。判定ルールは別表で列挙。

### 5. Phase 4 と公式 ZMK Studio クライアントの関係が未整理

[docs/zmk-studio-like-app-plan.md:184-200](zmk-studio-like-app-plan.md#L184-L200) は「ZMK Studio RPC 相当の通信経路を調査・実装する」と書いているだけで、**公式 Web クライアントを使わずに自作する理由**が明示されていない。

- 公式クライアントは Web Serial / Web Bluetooth で動く
- roBa_R の studio-rpc-usb-uart snippet と組み合わせれば既に直接反映できる
- 自作の価値があるとすれば「`.keymap` 保存と直接反映を同じ UI で行う」「Windows JIS 補正を直接反映側にも適用する」あたり

個人利用前提なら、**Phase 4 を作らず公式 Studio クライアントに任せる**のが最も合理的。自作価値は Phase 1〜3（読み取り・Markdown・ローカル編集・Windows JIS 補正）に集中させるべき。

→ 「現時点の結論」セクションに **「Phase 4 は公式 Studio クライアント併用も選択肢」** を追記する。

### 6. 物理レイアウト情報の取得元が未確定

[docs/zmk-studio-like-app-plan.md:91](zmk-studio-like-app-plan.md#L91) で「物理レイアウト情報をどこから取るか」を Phase 0 確認事項に挙げているが、候補が並んでいない。実際には:

- `keymap-drawer/roBa.yaml` の `layout` セクション（手調整ありの可能性）
- `config/roBa.json`（keymap-editor 用、座標を持っている可能性）
- ZMK の physical-layout DTS（v0.3-branch でどこまで使えるか要確認）

の 3 候補があり、**どれを正にするかで Phase 1 の難易度が大きく変わる**。Phase 0 の成果物に「物理レイアウトの単一情報源（SSoT）の決定」を入れるべき。

### 7. runtime keymap と repository keymap のずれ：方針が弱い

[docs/zmk-studio-like-app-plan.md:341-349](zmk-studio-like-app-plan.md#L341-L349) は「ユーザーに選ばせる」で終わっているが、これは UX 上ほぼ確実に詰む。

- 直接反映を行ったあと、`.keymap` を編集してビルドし直すと direct 変更が消える
- 逆に `.keymap` を変更して flash すると、Studio 側で書いた runtime 変更が消える
- ZMK Studio 公式は「ロック解除中の変更は永続化される」「ファームウェア再書き込みで消える」という設計を取っている

→ **「直接反映は一時的なプレビュー、確定は必ず `.keymap` 経由」というモード固定**を検討すべき。あるいは「ロック解除中だけ direct 編集を許可、ロック時に `.keymap` に転記」のような明確なルールが要る。

### 8. テスト戦略

個人利用なら CI を整えるほどではないが、**`.keymap` パーサの round-trip テスト（parse → serialize → 文字列差分なし）** は手元で `npm test` が通る程度には残すべき。これが品質維持の根幹。

→ 「おすすめ追加機能」優先度高に **「`.keymap` round-trip 検証（編集なしで保存して差分が出ないこと）」** を追加。

---

## 個人利用前提で不要・影響度が下がる点

### 不要

- 配布戦略（Windows コード署名、自動更新、配布チャネル）
- ライセンス互換性の厳密チェック（GPL 由来コードの再配布など）
- Electron の配布サイズ問題（Tauri を選ぶ動機が一つ消える）

### 影響度が下がる

- テスト戦略（CI 整備までは不要、手元実行で十分）
- 既存ツール fork の選択肢（個人 fork なら upstream 還元義務がない → むしろ魅力が増す）

---

## 軽微な指摘

- [docs/zmk-studio-like-app-plan.md:36](zmk-studio-like-app-plan.md#L36) の `.overlay` は roBa では shield 側 `boards/shields/roBa/*.overlay` を指すはずなので、参照場所を明示するとよい
- [docs/zmk-studio-like-app-plan.md:174](zmk-studio-like-app-plan.md#L174) の `keymap parse -c 10 -z config/roBa.keymap > keymap-drawer/roBa.yaml` は Bash 記法。AGENTS.md は PowerShell 前提なので、`| Out-File -Encoding utf8` 系の例も併記する方が一貫する
- [docs/zmk-studio-like-app-plan.md:212](zmk-studio-like-app-plan.md#L212) の「encoder / sensor binding 表示」は Phase 5 だが、roBa_L には実際にエンコーダがあり、Phase 1 の「全キー一覧表示」段階で sensor-bindings をどう表示するか触れる必要がある

---

## 計画書への反映提案（最小編集）

1. 冒頭「目的」セクションに **「配布せず個人利用」** を明記
2. 「推奨する実装方針」を **Web アプリ優先、必要に応じて Electron 移行** に書き換え
3. Phase 0 に **「既存ツール（keymap-editor / ZMK Studio）の評価と fork 検討」** を追加
4. Phase 0 に **「`.keymap` 編集戦略の選定」「物理レイアウトの SSoT 決定」** を追加
5. データモデルに `bindingKind` discriminator を導入し、判定ルールを別表化
6. Phase 4 冒頭に **「自作で何を上乗せするのか」** を明記、または公式併用案を追記
7. runtime / repository 同期方針を **モード固定**に書き換え
8. 「現時点の結論」に **「Phase 4 は公式 Studio クライアント併用も選択肢」** を追記
9. レビュー論点から「配布」「ライセンス互換」関連を削除

---

## 追加で検討してほしい論点

[docs/zmk-studio-like-app-plan.md:368-378](zmk-studio-like-app-plan.md#L368-L378) のレビュー論点に以下を追加:

- 既存 keymap-editor を fork / 拡張する選択肢を捨てる根拠
- Phase 1〜2 を Web App、Phase 4 で Electron に移行する二段構えの是非
- `.keymap` パーサを自作するか、keymap-editor / keymap-drawer のものを流用するか
- runtime keymap と `.keymap` の同期で「片方を必ず正にする」モード固定にするか
- Phase 4 を自作せず公式 ZMK Studio クライアント併用にする選択肢の可否

---

## 結論

「方向性は妥当だが、Phase 0 の調査範囲と Phase 2 の編集戦略の解像度が足りない」が総評。

特に **既存 keymap-editor / ZMK Studio 公式クライアントとの差別化を明文化しないと、自作する正味の価値が説明できない** のが最大の弱点。個人利用前提なら **Electron 採用と Phase 4 自作の必然性が大きく下がる**ため、Web アプリ優先 + 公式 Studio クライアント併用の構えに方針を寄せることで、初動を最小化しつつ実用価値を早期に出せる。

MVP 着手前に Phase 0 をもう一段掘ることを推奨する。
