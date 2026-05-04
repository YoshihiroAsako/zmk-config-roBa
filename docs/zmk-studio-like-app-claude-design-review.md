# Claude Design モックアップレビュー

作成日: 2026-05-04

対象:

- `docs/claude-design-roba-app/`
- `docs/claude-design-roba-app/screenshots/main.png`
- `config/roBa.json`
- `config/roBa.keymap`

## 結論

Claude Design の出力は、read-only MVP の画面構成を決める資料として十分使える。

一方で、実装の土台としては静的な `keymapData.js` に依存しており、正本である `config/roBa.json` / `config/roBa.keymap` から都度読み取る構成ではない。そのため、モックアップは `docs/` に資料として残し、実アプリは `tools/roba-keymap-viewer/` に Vite + React で新規実装する判断にした。

## 良い点

- 左レイヤー、中央キーボード、右詳細、下部タブの情報配置は roBa の確認作業に合っている。
- 43 キーの左右分割と親指キーの回転が反映されている。
- combo / macro / behavior / sensor-bindings / Markdown preview を同じ画面で扱う方向性は妥当。
- read-only と repo canonical の注意表示があり、ZMK Studio 併用時のずれを意識しやすい。

## 実装時に変える点

- `docs/claude-design-roba-app/uploads/` のコピーではなく、必ず `config/roBa.json` / `config/roBa.keymap` を読む。
- 静的な layer / binding 配列を手書きで持たず、`.keymap` から read-only parser で抽出する。
- 初期 MVP では Tweaks や編集 UI を入れず、表示、一覧、Markdown、診断に絞る。
- DTS physical layout の key count と `config/roBa.json` / `.keymap` の count 整合を Diagnostics に出す。
- Windows JIS 補正済みの表示は raw binding と併記し、誤って raw keycode を期待出力と読まないようにする。

## 今回の次アクション

`tools/roba-keymap-viewer/` を作成し、Vite + React の read-only MVP として実装する。

初期スコープ:

- `config/roBa.json` から 43 キー物理レイアウトを表示
- `config/roBa.keymap` から 7 layer / bindings / combos / macros / behaviors / sensor-bindings を抽出
- layer selector
- key selection detail
- bindings / combos / macros / behaviors / sensors table
- Markdown preview
- Diagnostics

編集、保存、ファームウェア直接反映は含めない。
