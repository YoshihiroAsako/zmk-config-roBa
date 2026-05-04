# Current Work Status

このファイルは、新しいチャットや別の AI エージェントでも作業をすぐ再開できるようにするための引き継ぎメモです。
詳細な理由やレビュー経緯は各計画書に置き、このファイルには「今どこまで進んでいて、次に何をするか」を短く残します。

## 現在の作業テーマ

roBa のマルチホスト対応、Windows JIS 記号補正、トラックボールスクロール改善。

## 2026-05-04 追加テーマ

roBa 用 ZMK Studio 風ローカルアプリの計画検討。

- [x] 他 AI レビュー用の独立計画書 `docs/zmk-studio-like-app-plan.md` を作成
- [x] 他 AI レビュー結果 `docs/zmk-studio-like-app-plan-review.md` を再レビュー
- [x] 再レビュー結果 `docs/zmk-studio-like-app-plan-rereview.md` を作成
- [x] Claude Design でデザインモックアップを作る工程を計画に追加
- [x] `docs/zmk-studio-like-app-plan.md` をレビュー結果込みの最新版に改訂
- [x] Phase 0 の既存ツール調査メモ `docs/zmk-studio-like-app-phase0-research.md` を作成
- [x] Phase 0 調査メモの他 AI レビュー依頼文 `docs/zmk-studio-like-app-phase0-review-request.md` を作成
- [x] Phase 0 調査メモのレビューを実施 (DTS physical-layout 確認、Studio 永続化、編集 range 置換方針、PC キー割り当ての Phase 配置を追記)
- [x] DTS `roba_physical_layout` の存在を確認 (`boards/shields/roBa/roBa.dtsi`)
- [x] Phase 0 調査メモ更新後の再レビュー依頼文 `docs/zmk-studio-like-app-phase0-rereview-request.md` を作成
- [x] Phase 0 調査メモの再レビュー結果 `docs/zmk-studio-like-app-phase0-rereview.md` を作成
- [x] Phase 0 再レビュー結果を `docs/zmk-studio-like-app-phase0-research.md` に反映
- [x] combo / macro など高度編集 UI/UX メモ `docs/zmk-studio-like-app-advanced-editing-ux-notes.md` を作成
- [ ] Keymap Editor を roBa の `config/roBa.keymap` / `config/roBa.json` で実際に試す
- [ ] Claude Design に渡す UI モックアップ依頼文を作成する

## 最新の結論

- Windows JIS を主用途として扱う。
- Mac / iPad / iPhone / Android は補助レイヤーで吸収する。
- 第 1 段階はトラックボールスクロール改善だけに絞る。
- `west.yml` / driver revision は今回は変更しない。
- `zmk-pmw3610-driver` は確認時点のコミットハッシュだけ記録する。
- Windows JIS 記号補正は、予測表で補正候補を作り、実機で答え合わせしてから確定表に基づいて補正する。
- レイヤー 5 `SCROLL` は、トラックボールをスクロールモードにするための状態レイヤーとして扱う。
- `&mo 5` をどのキーに置いても、押している間は同じスクロール操作ができる。

## 現在の進捗

- [x] マルチホスト・Windows JIS・トラックボールスクロール対応の初期計画書を作成
- [x] Claude Code Opus による一次レビューを反映
- [x] Codex による二次レビューを反映
- [x] Claude Code Opus による三次レビューを反映
- [x] 四次レビューで `west.yml` 固定案を撤回し、コミットハッシュ記録のみへ修正
- [x] 「先回り補正」表現を「補正候補作成 → 実機確認 → 確定表で補正」に修正
- [x] 作業再開用の `docs/current-work-status.md` を作成
- [x] `AGENTS.md` に作業再開ルールを追加
- [x] 事前調査
- [x] `scroll_tap` の最小実装
- [x] keymap-drawer 更新
- [x] GitHub Actions ビルド確認
- [x] 実機検証 (2026-05-02: 専用 `&mo 5` キーでトラックボールスクロール成功)
- [x] Windows JIS 記号検証用に Layer 3 `ARROW` へ No. 1-23 の記号を順番配置
- [x] Windows JIS 記号実機検証結果を `docs/windows-jis-symbol-validation.md` に入力
- [x] Windows JIS 記号補正案の作成
- [x] Layer 2 `NUM` と combo に Windows JIS 補正候補を反映
- [x] `docs/windows-jis-symbol-validation.md` に補正後再検証用の入力表を追加
- [x] `docs/windows-jis-symbol-validation.md` 冒頭に ZMK Studio 用逆引き表を追加
- [x] Windows JIS 補正後の実機確認結果を `docs/windows-jis-symbol-validation.md` に入力
- [x] 補正後再検証で外れた `*` を `&kp DOUBLE_QUOTES` に再補正
- [x] combo 補正後再検証で `J` + `K` = `"`、`C` + `V` = `=` を確認
- [x] `*` 再補正後の実機確認

## 次にやること

1. Windows JIS 記号補正の最終差分を確認する。
2. 必要に応じて commit / push する。

## 参照すべきファイル

- `AGENTS.md`
- `docs/current-work-status.md`
- `docs/keymap-multihost-scroll-plan.md`
- `docs/keymap-flashing-guide.md`
- `docs/windows-jis-symbol-validation.md`
- `docs/zmk-studio-like-app-plan.md`
- `docs/zmk-studio-like-app-plan-review.md`
- `docs/zmk-studio-like-app-plan-rereview.md`
- `docs/zmk-studio-like-app-phase0-research.md`
- `docs/zmk-studio-like-app-phase0-review-request.md`
- `docs/zmk-studio-like-app-phase0-rereview.md`
- `docs/zmk-studio-like-app-advanced-editing-ux-notes.md`
- `config/roBa.keymap`
- `keymap-drawer/roBa.yaml`
- `keymap-drawer/roBa.svg`

## 作業方針メモ

- 第 1 段階では Windows JIS 記号補正には入らない。
- 第 1 段階では Mac / モバイル補助レイヤーも追加しない。
- `config/west.yml` は変更しない。
- `build.yaml` も変更しない。
- 既存の `layer_6` はリネームしない。
- 表示に影響する keymap 変更では `keymap-drawer/roBa.yaml` と `keymap-drawer/roBa.svg` を更新する。
- `keymap-drawer/roBa.yaml` を上書きする前後で、手動調整が壊れていないか差分を確認する。

## 未決事項

- `I` の `scroll_tap` 案は実機で `I` 連続入力になったため撤回。
- `LEFT_ALT` 位置の専用 `&mo 5` (`SCROLL`) は、ユーザーが ZMK Studio でも変更できるため、いったん現状位置で採用する。
- `SCROLL` レイヤーは作り込まず、スクロール中にも必要なキーが出た場合だけ最小限追加する。
- Windows JIS 記号補正は、`docs/windows-jis-symbol-validation.md` の実機結果を埋めてから行う。

## 事前調査結果

- 2026-05-02 時点で `zmk@v0.3-branch` の `zmk,behavior-hold-tap.yaml` に `hold-while-undecided` が定義されていることを確認済み。
- 2026-05-02 時点で `zmk@v0.3-branch` の `keys.h` に `INT1` / `INT_RO` / `INT3` / `INT_YEN` / `LANG1` / `LANG2` / `GLOBE` が定義されていることを確認済み。
- 2026-05-02 時点の `kumamuk-git/zmk-pmw3610-driver` `main` は `5e04553ab803d24405bd45621a41310ea3050e59`。
- 上記 driver では `get_input_mode_for_current_layer()` が `scroll-layers` を先に判定し、automouse は `input_mode == MOVE` の場合だけ起動するため、SCROLL レイヤーでは scroll 優先と判断。
- `keymap` コマンドはこのローカル環境では未検出。今回の表示内容は `I` hold = `SCROLL` のままで変わらないため、`keymap-drawer/roBa.yaml` と `keymap-drawer/roBa.svg` は更新不要。

## GitHub Actions 結果

- 2026-05-02: workflow run `25248589390` (`.github/workflows/build.yml`) が成功。
- 成功ジョブ: `roBa_L` / `roBa_R` (`studio-rpc-usb-uart`) / `settings_reset` / artifact merge。
- 生成 artifact: `firmware`。

## 実機検証メモ

- 2026-05-02: `&st 5 I` を書き込んだが、`I` 長押しで `I` が連続入力され、トラックボールスクロールはできなかった。
- Windows の UF2 コピー時に `0x800701B1` が出ることがあるが、コピー後に bootloader ドライブが消えてキーボードとして復帰するため、UF2 書き込み自体は成功している可能性が高い。
- 2026-05-02: `I` は通常の `&kp I` に戻し、`LEFT_ALT` 位置を `&mo 5` に変更。専用キーで SCROLL レイヤーを確実に有効化する方針で再検証する。
- 2026-05-02: 専用 `SCROLL` キーを押しながらトラックボールでスクロールできることを実機確認済み。
- 2026-05-03: Windows JIS 記号検証結果を入力済み。`-` / `/` / `!` / `#` / `$` / `%` / `.` は表示どおり、`+` は `~`、`^` は `&`、`&` は `'`、`_` は `=`、`@` は `"`、`=` は `^`、`[` は `@`、`\` は `]`、`|` は `}` として出ることを確認。`~` / `)` / `*` / `double_quotation` は追試候補。
- 2026-05-03: Layer 2 `NUM` に Windows JIS 補正候補を反映。`_` は `LS(INT_RO)`、`\` は `INT_YEN`、`|` は `LS(INT_YEN)` を採用候補にしたため、実機確認が必要。`double_quotation` combo は `J` + `K` (`<18 19>`) へ修正し、binding は Windows JIS で `"` が出る `AT_SIGN` に変更。`eq` combo は `UNDERSCORE` に変更。
- 2026-05-03: 補正後再検証では `*` 以外の Layer 2 `NUM` 記号は期待出力どおり。`*` は `&kp AT_SIGN` で `"` が出たため、`&kp DOUBLE_QUOTES` に変更。combo は `J` + `K` = `"`、`C` + `V` = `=` を確認済み。
- 2026-05-03: `&kp DOUBLE_QUOTES` に再補正した `*` も実機で表示どおり出ることを確認。Windows JIS 記号補正は現時点で全項目 OK。

## 新しいチャットでの再開メモ

新しいチャットでは、エージェントが `AGENTS.md` の作業再開ルールに従い、このファイルを読んで続きから再開する想定。
ユーザーの最新指示がこのファイルと矛盾する場合は、ユーザーの最新指示を優先する。
