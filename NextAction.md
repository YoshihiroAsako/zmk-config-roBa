# NextAction

> 運用ルールは `AGENTS.md` §1 を参照。AI はこのファイルを自発的に更新しない(「NextAction更新」指示時のみ・追記型)。
> (旧 `docs/current-work-status.md` を 2026-07-04 に本ファイルへ移行。全文スナップショットは `Archive.md`)

## 現在地

ローカル keymap viewer/editor(`tools/roba-keymap-viewer/`)は Phase 5.5+Task A〜F まで実装・push 済みで、主要機能は一通り揃っている(最新: combo 11+10 の binding 編集不可修正、204 tests / 26 suites 全パス・build 成功)。ユーザーは当面の追加実装を急いでいない。

## 決定済み事項

- **Studio RPC / Studio 代替アプリ計画(`docs/studio_alt_app.md`)は凍結中**。ユーザーが明示的に「再開したい」「M-1 に着手したい」と言うまで調査・ADR・PoC・実装を開始しない。再開時も M0 実装ではなく M-1 設計確定フェーズから。
- viewer は ZMK Studio の完全代替ではなく併用するローカル補助アプリ。`config/roBa.keymap` と `config/roBa.json` が正本。
- Task G(`&msc` sensor-binding)はスコープ外(需要薄・実装コスト高)。Task H(ハードウェアレベル方向反転)もスコープ外(再ビルド必要。UI 注記で対応済み)。
- 2026-07-04: AI エージェント設定を 2 層構造(共通層+固有層)へ移行。作業状態ファイルを `docs/current-work-status.md` から本ファイルへ改名・変換。

## Next Actions

(必須タスクなし。着手時にユーザーと確認)

1. (任意)Key Press 修飾キー選択 UI の追加動作確認(`&kp LS(PSCRN)` / `&kp LC(LS(TAB))` の作成)。
2. (任意)New combo / New macro の保存フローの追加手動ブラウザ確認。
3. (任意)Macro binding 行追加/削除の UX 微調整(行の並べ替え・undo 表示)。

## 保留・未決

- Studio 代替アプリ計画(凍結。上記のとおり明示指示があるまで着手しない)。
- viewer 実装時の注意点(LayerRenameRow の配置・`&lt N` は index ベース等)は `Archive.md` スナップショット「現在の注意点」を参照。
