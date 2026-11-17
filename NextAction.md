# NextAction

> 運用ルールは `AGENTS.md` §1 を参照。
> 作業完了・判断確定・重要な問題の変化・中断・引継ぎ・終了時に自動更新する。状態変化がなければ更新しない。現在有効な情報を残し、過去の項目は原文と決着内容を Archive に保存・確認してから整理する。
> (旧 `docs/current-work-status.md` を 2026-07-04 に本ファイルへ移行。全文スナップショットは `Archive.md`)

## 現在地

ローカル keymap viewer/editor(`tools/roba-keymap-viewer/`)は Phase 5.5+Task A〜F まで実装・push 済み。2026-11-18、改善案 B（UX-03・UX-07）のローカル実装・検証を完了。関連変更を commit・origin/main へ push するよう指示済み。

編集フォームの先頭配置、内部情報の折りたたみ、日本語の主操作、狭い画面の縦配置、図・一覧・ダイアログのキー操作を整備。209 tests / 28 suites 全成功・build 成功。1280×720、狭いウィンドウ、200%表示を画面確認。

設計は `docs/design/20261117-viewer-layout-keyboard.md`、検証詳細は `docs/reviews/2026-11-17-viewer-ux-review.md` の案 B 追記。ブラウザからの実保存・復元、実機反映、読み上げソフト、本人の使用感は未確認。UX-01/02/04/05/06 は未判断・未実装。

## 決定済み事項

- 改善案 B の実装・検証・記録と origin/main への commit・push は指示済み。
- **Studio RPC / Studio 代替アプリ計画(`docs/studio_alt_app.md`)は凍結中**。ユーザーが明示的に「再開したい」「M-1 に着手したい」と言うまで調査・ADR・PoC・実装を開始しない。再開時も M0 実装ではなく M-1 設計確定フェーズから。
- viewer は ZMK Studio の完全代替ではなく併用するローカル補助アプリ。`config/roBa.keymap` と `config/roBa.json` が正本。
- Task G(`&msc` sensor-binding)はスコープ外(需要薄・実装コスト高)。Task H(ハードウェアレベル方向反転)もスコープ外(再ビルド必要。UI 注記で対応済み)。
- 2026-07-04: AI エージェント設定を 2 層構造(共通層+固有層)へ移行。作業状態ファイルを `docs/current-work-status.md` から本ファイルへ改名・変換。

## Next Actions

(今回の依頼内の残作業なし。追加改善は別途指示待ち)

1. (任意)Key Press 修飾キー選択 UI の追加動作確認(`&kp LS(PSCRN)` / `&kp LC(LS(TAB))` の作成)。
2. (任意)New combo / New macro の保存フローの追加手動ブラウザ確認。
3. (任意)Macro binding 行追加/削除の UX 微調整(行の並べ替え・undo 表示)。
4. (採否待ち)残る使い勝手レビュー候補 UX-01/02/04/05/06。実装指示を受けてから着手し、完了条件はレビュー記録を参照。UX-03/07 はローカル実装・指定検証済み。

## 保留・未決

- Studio 代替アプリ計画(凍結。上記のとおり明示指示があるまで着手しない)。
- 2026-11-17: 再読み込み時の無警告の下書き消失を画面確認。単一キー保存で他下書きも消す処理をコード確認(保存での再現は未実施)。改善候補 UX-01 は未判断・修正未着手。
- viewer 実装時の注意点(LayerRenameRow の配置・`&lt N` は index ベース等)は `Archive.md` スナップショット「現在の注意点」を参照。
