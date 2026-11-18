# NextAction

> 運用ルールは `AGENTS.md` §1 を参照。
> 作業完了・判断確定・重要な問題の変化・中断・引継ぎ・終了時に自動更新する。状態変化がなければ更新しない。現在有効な情報を残し、過去の項目は原文と決着内容を Archive に保存・確認してから整理する。
> (旧 `docs/current-work-status.md` を 2026-07-04 に本ファイルへ移行。全文スナップショットは `Archive.md`)

## 現在地

ローカル keymap viewer/editor(`tools/roba-keymap-viewer/`)は Phase 5.5+Task A〜F と改善案 B（UX-03・UX-07）を push 済み。案 B は `be3ab44`。

2026-11-18、改善案 A（UX-01 の保存保護・操作整理と UX-02 の編集中の配置図）を `2203685` で push 済み。GitHub Actions のビルド成功を確認。212 tests / 29 suites 全成功、build 成功。一時コピーで混在変更の単一保存・一括保存・復元と、入力保護・配置比較をブラウザ確認した。

同日、案 A・B・C(UX-04・05・06・08・10・11・13・14・16)をローカル実装・指定検証済み。commit・push 済み(`037ce09`。GitHub Actions のビルド成功を確認)。228 tests 全成功、build 成功。一時コピーで保存・復元・交換・逆引き等をブラウザ確認。設計と検証は `docs/design/20261118-viewer-check-visual-edit.md`。UX-09・12・15 は未判断。

案 A の設計と検証は `docs/design/20261118-viewer-save-preview.md`。案 B の検証詳細は既存のレビュー記録を参照。実機反映、読み上げソフト、本人の使用感は未確認。

## 決定済み事項

- 改善案 A の関連変更の commit・origin/main への push は指示済み(`2203685` で完了)。
- **Studio RPC / Studio 代替アプリ計画(`docs/studio_alt_app.md`)は凍結中**。ユーザーが明示的に「再開したい」「M-1 に着手したい」と言うまで調査・ADR・PoC・実装を開始しない。再開時も M0 実装ではなく M-1 設計確定フェーズから。
- viewer は ZMK Studio の完全代替ではなく併用するローカル補助アプリ。`config/roBa.keymap` と `config/roBa.json` が正本。
- Task G(`&msc` sensor-binding)はスコープ外(需要薄・実装コスト高)。Task H(ハードウェアレベル方向反転)もスコープ外(再ビルド必要。UI 注記で対応済み)。
- 2026-07-04: AI エージェント設定を 2 層構造(共通層+固有層)へ移行。作業状態ファイルを `docs/current-work-status.md` から本ファイルへ改名・変換。

## Next Actions

(今回の依頼内の残作業なし。追加改善は別途指示待ち)

1. (任意)Key Press 修飾キー選択 UI の追加動作確認(`&kp LS(PSCRN)` / `&kp LC(LS(TAB))` の作成)。
2. (任意)New combo / New macro の保存フローの追加手動ブラウザ確認。
3. (任意)Macro binding 行追加/削除の UX 微調整(行の並べ替え・undo 表示)。
4. 案 A・B・C の変更の本人の試用と実機反映は未確認。
5. (採否待ち)未着手の候補 UX-09・12・15(`Candidates.md`)。

## 保留・未決

- Studio 代替アプリ計画(凍結。上記のとおり明示指示があるまで着手しない)。
- UX-01 の下書き自動退避・再起動後の復旧は次段階。実装指示待ち。
- viewer 実装時の注意点(LayerRenameRow の配置・`&lt N` は index ベース等)は `Archive.md` スナップショット「現在の注意点」を参照。
