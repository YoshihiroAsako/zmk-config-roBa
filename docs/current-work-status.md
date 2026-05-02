# Current Work Status

このファイルは、新しいチャットや別の AI エージェントでも作業をすぐ再開できるようにするための引き継ぎメモです。
詳細な理由やレビュー経緯は各計画書に置き、このファイルには「今どこまで進んでいて、次に何をするか」を短く残します。

## 現在の作業テーマ

roBa のマルチホスト対応、Windows JIS 記号補正、トラックボールスクロール改善。

## 最新の結論

- Windows JIS を主用途として扱う。
- Mac / iPad / iPhone / Android は補助レイヤーで吸収する。
- 第 1 段階はトラックボールスクロール改善だけに絞る。
- `west.yml` / driver revision は今回は変更しない。
- `zmk-pmw3610-driver` は確認時点のコミットハッシュだけ記録する。
- Windows JIS 記号補正は、予測表で補正候補を作り、実機で答え合わせしてから確定表に基づいて補正する。

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
- [x] keymap-drawer 更新不要の確認
- [ ] GitHub Actions ビルド確認
- [ ] 実機検証

## 次にやること

1. `config/roBa.keymap` の変更内容を確認する。
2. GitHub Actions で `roBa_L` / `roBa_R` / `settings_reset` のビルドを確認する。
3. Actions 成功後、左右に `.uf2` を書き込む。
4. Windows JIS 環境で `I` 単押し / 連打 / 長押し + トラックボールスクロールを実機検証する。
5. 併走で combo `double_quotation` / `eq` の Windows JIS 実出力を記録する。

## 参照すべきファイル

- `AGENTS.md`
- `docs/current-work-status.md`
- `docs/keymap-multihost-scroll-plan.md`
- `docs/keymap-flashing-guide.md`
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

- `scroll_tap` の `flavor` は初期値 `tap-preferred` で進める。
- `scroll_tap` の `quick-tap-ms` は初期値 `0` で進める。
- 実機で違和感があれば `balanced` や `quick-tap-ms = <100>` を検討する。
- Windows JIS 記号補正は、第 1 段階のスクロール改善が完了してから別段階で扱う。

## 事前調査結果

- 2026-05-02 時点で `zmk@v0.3-branch` の `zmk,behavior-hold-tap.yaml` に `hold-while-undecided` が定義されていることを確認済み。
- 2026-05-02 時点で `zmk@v0.3-branch` の `keys.h` に `INT1` / `INT_RO` / `INT3` / `INT_YEN` / `LANG1` / `LANG2` / `GLOBE` が定義されていることを確認済み。
- 2026-05-02 時点の `kumamuk-git/zmk-pmw3610-driver` `main` は `5e04553ab803d24405bd45621a41310ea3050e59`。
- 上記 driver では `get_input_mode_for_current_layer()` が `scroll-layers` を先に判定し、automouse は `input_mode == MOVE` の場合だけ起動するため、SCROLL レイヤーでは scroll 優先と判断。
- `keymap` コマンドはこのローカル環境では未検出。今回の表示内容は `I` hold = `SCROLL` のままで変わらないため、`keymap-drawer/roBa.yaml` と `keymap-drawer/roBa.svg` は更新不要。

## 新しいチャットでの再開メモ

新しいチャットでは、エージェントが `AGENTS.md` の作業再開ルールに従い、このファイルを読んで続きから再開する想定。
ユーザーの最新指示がこのファイルと矛盾する場合は、ユーザーの最新指示を優先する。
