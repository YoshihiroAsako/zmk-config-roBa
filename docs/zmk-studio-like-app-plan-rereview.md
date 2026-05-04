# `zmk-studio-like-app-plan-review.md` 再レビュー

再レビュー日: 2026-05-04

対象:

- 元計画書: `docs/zmk-studio-like-app-plan.md`
- 他 AI レビュー: `docs/zmk-studio-like-app-plan-review.md`

参考確認:

- ZMK Studio 公式ドキュメント: https://zmk.dev/docs/features/studio
- Keymap Editor GitHub: https://github.com/nickcoutsos/keymap-editor
- Keymap Editor 作者説明: https://nickcoutsos.github.io/projects/keymap-editor/
- ZMK Studio GitHub: https://github.com/zmkfirmware/zmk-studio

## 総評

他 AI レビューの主張は、おおむね採用すべき。

特に以下の指摘は重要度が高い。

- 既存ツール調査が Phase 0 から抜けている
- 個人利用前提なら Electron より Web アプリ優先が軽い
- `.keymap` 編集戦略が曖昧
- 物理レイアウトの単一情報源が未決定
- ZMK Studio 直接反映とリポジトリ `.keymap` の同期方針が弱い

ただし、レビュー結果には補正すべき点もある。

- Keymap Editor の fork は有力だが、GitHub README では「最近のソース更新は公開されていない」と明記されている。そのため、fork 前提ではなく「既存アプリ利用 / 公開済み旧ソース fork / 自作」の比較にするべき。
- ZMK Studio の直接反映を「一時的なプレビュー」とみなす設計は注意が必要。公式ドキュメントでは、Studio 管理を始めると `.keymap` 変更がそのまま適用されない旨が書かれている。つまり、Studio 変更は単なる一時状態ではなく、永続化された runtime/settings 側の状態として扱うべき。
- Phase 4 を完全に捨てるより、当面は公式 Studio 併用、将来は「`.keymap` 保存と直接反映の同時適用」が必要になった場合だけ自作調査、という整理がよい。

## 採用すべき指摘

### 1. 既存ツール調査を Phase 0 の最優先にする

採用。

`config/roBa.json` には keymap-editor 用と思われるレイアウト情報があり、`sensors` 情報も含まれている。元計画書が Keymap Editor を評価していなかったのは明確な抜け。

Phase 0 に追加すべき比較対象:

- Nick Coutsos Keymap Editor
- ZMK Studio 公式 Web / Native クライアント
- keymap-drawer
- roBa 既存メタデータ
  - `config/roBa.json`
  - `keymap-drawer/roBa.yaml`
  - `config/roBa.keymap`

比較観点:

- GitHub なしで使えるか
- ローカル `.keymap` を読み書きできるか
- roBa の物理レイアウトをそのまま使えるか
- Windows JIS 補正を追加できるか
- Markdown 出力を追加できるか
- sensor-bindings / encoder を表示できるか
- 直接反映と組み合わせられるか

### 2. Web アプリ優先へ方針変更する

採用。

個人利用で配布しないなら、Electron の利点は下がる。Keymap Editor も Chromium 系ブラウザで File System Access API によるローカル `.keymap` 読み書きをサポートしている。

修正後の推奨構成:

1. Phase 1-2 は Vite + React のローカル Web アプリ
2. ローカルファイル操作は File System Access API を第一候補にする
3. File System Access API が足りない場合だけ、小さな Node CLI / Electron / Tauri を検討する
4. Phase 4 のデバイス通信は、まず公式 ZMK Studio を併用する

### 3. `.keymap` 編集戦略を先に決める

採用。

roBa の `config/roBa.keymap` には、以下のような単純ではない binding がある。

- `&mt LEFT_SHIFT Z`
- `&lt 2 SPACE`
- `&lt_to_layer_0 6 INT_HENKAN`
- `&kp LS(LG(S))`
- `&bt BT_SEL 0`
- combo
- macro
- custom behavior
- sensor-bindings

そのため、単純な文字列置換だけで安全に編集するのは危険。

Phase 0 で選ぶべき編集戦略:

- 既存 Keymap Editor の利用で済ませる
- 公開済み Keymap Editor ソースを参考にする
- tree-sitter + devicetree grammar を使う
- roBa 専用の限定パーサを作る
- keymap-drawer YAML を編集元にして `.keymap` へ戻す

現時点の推奨は、最初に「編集なし round-trip で差分が出ない」ことを必須条件にすること。

### 4. データモデルを型付き binding にする

採用。

`params: string[]` だけでは、layer 番号、keycode、modifier、behavior 引数の区別が落ちる。

修正案:

```ts
type BindingKind =
  | "kp"
  | "mt"
  | "lt"
  | "mo"
  | "to"
  | "bt"
  | "mkp"
  | "trans"
  | "none"
  | "macro"
  | "custom"
  | "unknown";

type BindingParam =
  | { kind: "keycode"; value: string; display?: string }
  | { kind: "modifier"; value: string }
  | { kind: "layer"; value: number; label?: string }
  | { kind: "number"; value: number }
  | { kind: "behavior-ref"; value: string }
  | { kind: "raw"; value: string };

type KeyBinding = {
  layerId: number;
  layerName: string;
  position: number;
  rawBinding: string;
  displayLabel: string;
  bindingKind: BindingKind;
  behavior: string;
  params: BindingParam[];
  sourceRange?: {
    start: number;
    end: number;
  };
  editability: "direct" | "source-only" | "read-only" | "unknown";
};
```

### 5. 物理レイアウトの SSoT を決める

採用。

候補は 3 つある。

- `config/roBa.json`
  - keymap-editor メタデータ
  - 座標と sensor 情報を持つ
  - アプリ用 SSoT として最有力
- `keymap-drawer/roBa.yaml`
  - 表示用の調整済み情報
  - key labels の見た目には強い
  - ただし生成物/手動調整混在の可能性がある
- ZMK physical-layout DTS
  - ZMK Studio との整合には重要
  - 現在の roBa リポジトリでどこまで定義されているか確認が必要

現時点の推奨:

- アプリの物理配置は `config/roBa.json` を第一候補にする
- 表示ラベルは `config/roBa.keymap` を解析して生成する
- Markdown / SVG 表示の比較用に `keymap-drawer/roBa.yaml` を参照する

### 6. sensor-bindings / encoder 表示を Phase 1 に入れる

採用。

roBa の `default_layer` と `ARROW` には `sensor-bindings` がある。ユーザー要求の「各キーに何が設定されているか一覧表示」に加えて、roBa ではエンコーダも確認対象に入れる方が自然。

Phase 1 に追加する:

- key bindings 一覧
- combo 一覧
- macro 一覧
- behavior 一覧
- sensor-bindings 一覧

編集は後回しでよいが、表示と Markdown 出力には含める。

### 7. round-trip テストを必須にする

採用。

MVP でも、`.keymap` を読み込んで編集せず保存したときに差分が出ないことは最低条件。

最低限の検証:

- parse -> serialize -> diff なし
- 1 キー変更 -> 変更箇所以外 diff なし
- Markdown 出力が全レイヤーの key position 数と一致
- `sensor-bindings` を落とさない

## 補正すべき指摘

### 1. Keymap Editor fork は有力だが、安易に最有力とは言い切れない

レビューでは「keymap-editor を fork して roBa 専用化」が最も現実的とされている。

方向性としては強いが、注意点がある。

- GitHub README では、最近のソース更新が公開されていないと説明されている
- 現在使える Web アプリの機能と、公開されているソースの機能が一致しない可能性がある
- 個人利用でも、古いソースを fork して最新挙動を再現するコストが読みにくい

したがって Phase 0 の判断は以下に分けるべき。

1. 既存 Keymap Editor をそのまま使い、足りない機能だけ別ツールで補う
2. 公開済み Keymap Editor ソースを fork して拡張する
3. Keymap Editor の設計だけ参考にして roBa 専用 Web アプリを自作する

### 2. ZMK Studio 直接反映を「一時プレビュー」に固定するのは危険

レビューでは「直接反映は一時的なプレビュー、確定は必ず `.keymap` 経由」という方針が提案されている。

狙いは理解できるが、ZMK Studio の実際の設計とずれる可能性がある。公式ドキュメントでは、ZMK Studio を使ってキーマップ管理を始めると、その後の `.keymap` 変更は UI の Restore Stock Settings を行わない限り適用されない、と説明されている。

つまり、Studio 側の変更は単なる一時プレビューではなく、設定ストレージ側に残る永続状態として扱うべき。

推奨方針:

- MVP では直接反映しない
- 直接反映は公式 ZMK Studio 併用を基本にする
- 自作アプリで直接反映する場合は、`.keymap` も同時更新する
- 直接反映を行ったあとに「リポジトリ版と Studio 保存状態がずれる」警告を必ず出す
- repo canonical / Studio canonical のどちらかをプロジェクト方針として選ぶ

roBa リポジトリ運用では、現時点では **repo canonical** が安全。

### 3. Phase 4 は削除ではなく「公式併用」に格下げがよい

レビューの「Phase 4 を作らず公式 Studio クライアントに任せる」は、短期方針として妥当。

ただし、ユーザー要求には「できれば GitHub を経由しないで直接変更できる」が含まれているため、計画から完全に消すより、次のように整理する方がよい。

- Phase 4A: 公式 ZMK Studio 併用手順をアプリ内に案内する
- Phase 4B: 公式 Studio で変更した内容を repo `.keymap` へ転記する支援を検討する
- Phase 4C: 必要になった場合のみ Web Serial / Web HID / Studio RPC 自作を調査する

## 元計画への修正方針

元計画書は以下の方向に改訂するのがよい。

1. 冒頭に「個人利用、Windows + Chromium 系ブラウザ優先」と明記する
2. 推奨構成を「Electron + React」から「Vite + React のローカル Web アプリ優先」に変更する
3. Electron / Tauri は Phase 4 以降の必要時候補に下げる
4. Phase 0 の最初に「既存ツール評価」を追加する
5. Phase 0 成果物に「fork / 併用 / 自作の判断」を追加する
6. `.keymap` 編集戦略と round-trip 検証を MVP 前のゲートにする
7. 物理レイアウト SSoT を `config/roBa.json` 第一候補として検証する
8. データモデルを typed binding に変更する
9. Phase 1 の Markdown 出力に sensor-bindings / combo / macro / custom behavior を含める
10. Phase 4 は「公式 Studio 併用を基本、自作は必要時」に変更する
11. runtime / repository 同期方針は repo canonical を第一候補にする

## 改訂後の推奨 MVP

最初の MVP は以下にする。

- 技術: Vite + React のローカル Web アプリ
- 実装前工程:
  - Phase 0 の既存ツール調査後に Claude Design で UI モックアップを作る
  - メイン画面、Markdown プレビュー、差分確認、直接反映可否表示の画面案を作る
  - モックアップを元に MVP に入れる UI と後回しにする UI を切り分ける
- 入力:
  - File System Access API で `config/roBa.keymap` を読む
  - `config/roBa.json` を物理レイアウト候補として読む
  - 必要に応じて `keymap-drawer/roBa.yaml` を比較参照する
- 表示:
  - レイヤー一覧
  - roBa ビジュアルレイアウト
  - key bindings 一覧
  - combo 一覧
  - macro / custom behavior 一覧
  - sensor-bindings 一覧
- 出力:
  - Markdown
  - JSON
- 編集:
  - 最初は read-only または 1 キー変更のみ
  - 1 キー変更でも round-trip 検証を必須にする
- 直接反映:
  - MVP には入れない
  - 公式 ZMK Studio への導線だけ用意する

## 最終判断

他 AI レビューは「既存ツール調査」「Web 優先」「`.keymap` 編集戦略の明確化」という点で正しい。

一方で、Keymap Editor fork と ZMK Studio direct まわりは少し慎重に扱うべき。

現時点の最良方針は以下。

1. まず Keymap Editor / ZMK Studio / roBa 既存メタデータを調査する
2. 自作する場合も Electron ではなく Web アプリから始める
3. `.keymap` 編集は round-trip 検証が通るまで狭く始める
4. 直接反映は公式 ZMK Studio 併用を基本にする
5. roBa の正本は当面 `config/roBa.keymap` とし、Studio 側変更とのずれを明示する

この修正を入れれば、計画はかなり現実的になる。
