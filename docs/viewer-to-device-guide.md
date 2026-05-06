# roBa Keymap Viewer で変更したキーマップを実機へ反映する手順書

## 0. 最短版（3分で思い出す）

```
[Viewer] Preview確認 → Save all
[Shell]  git add / commit / push
[Web]    GitHub Actions の成功を確認 → Artifacts から roBa_L.uf2 / roBa_R.uf2 を取得
[実機]   左 → ダブルリセット → roBa_L.uf2 をドライブへコピー
[実機]   右 → ダブルリセット → roBa_R.uf2 をドライブへコピー
[確認]   左右両側で新キーマップの動作を確認
```

> **重要**: 左右は**同じ Actions ビルド由来**の `.uf2` を使うこと。バージョンが混在すると動作が不安定になる。

---

## 1. 概要（何が自動で、何が手動か）

| ステップ | 自動 / 手動 | 内容 |
|---|---|---|
| Viewer での編集・プレビュー | 手動 | ブラウザで操作 |
| `config/roBa.keymap` への保存 | Viewer が実行（手動トリガー） | `Save all` ボタン押下時 |
| `config/roBa.keymap` のバックアップ作成 | Viewer が自動実行 | `Save all` 時に保存直前のファイルを退避（UI に `backupPath` 表示） |
| `keymap-drawer/roBa.yaml` / `roBa.svg` の再生成 | Viewer が自動実行 | `Save all` 後、`keymap` CLI が PATH にあれば自動再生成 |
| Git commit / push | **手動** | PowerShell で実行 |
| ファームウェアビルド | **自動**（push 後に GitHub Actions） | `roBa_L.uf2` / `roBa_R.uf2` を生成 |
| `.uf2` ダウンロード | 手動 | GitHub Actions の Artifacts から取得 |
| 実機への書き込み | 手動 | エクスプローラーでドラッグ＆ドロップ |

**Viewer は実機の現在状態を直接読み取れない。** `Reload source` はローカルの `config/roBa.keymap` を再読み込みするだけで、実機から読み取る操作ではない。

**正本は `config/roBa.keymap`（リポジトリのファイル）。** Viewer・ZMK Studio・実機の間でズレが起きた場合、このファイルを基準にする。

---

## 2. 事前準備

### 2-1. Viewer の起動確認

```powershell
# tools/roba-keymap-viewer ディレクトリで開発サーバーを起動
cd tools\roba-keymap-viewer
npm run dev
```

ブラウザで `http://127.0.0.1:5173/`（既に使用中の場合は Vite が表示する別ポートの URL）を開き、キーマップが読み込まれていることを確認する。

> **`Save all` は `npm run dev` の開発サーバー上でのみ有効**。`npm run preview` や `npm run build` の成果物では保存 API が動作しない。実機反映を伴う作業では必ず `npm run dev` で起動すること。
>
> keymap-drawer の自動再生成も `Save all` から呼ばれるため、`keymap` CLI（keymap-drawer）が PATH に通っていることを確認しておくとよい。通っていない場合でも保存自体は成功し、UI に「keymap CLI not found on PATH」と表示される（その場合は 4-2 のフォールバック手順で手動再生成する）。

### 2-2. 作業前のリポジトリ状態確認

```powershell
git status
git log --oneline -5
```

- `config/roBa.keymap` に未コミットの差分がないこと。
- 作業前に `main` ブランチが最新であること（`git pull` が必要なら実行する）。

---

## 3. Viewer での変更確定手順

### 3-1. キーマップを編集する

Viewer のブラウザ UI で対象のキー・コンボ・マクロを編集する。

### 3-2. Preview を確認する

- **Context Diff** タブで変更差分を確認する。
- **`.keymap Preview`** タブで変更後の全体を確認する。
- 意図した変更のみが差分に含まれていることを確かめる。

### 3-3. Save all を実行する

- Viewer の **`Save all`** ボタンをクリックする。
- 保存処理中は「Saving...」表示になる。完了後、画面のステータス表示を必ず2か所確認する:
  1. **保存ステータス**: `Saved .keymap` / `Saved pending changes` などの成功表示と、退避された **`backupPath`**（保存直前のファイルが自動でバックアップされる）。
  2. **`keymap-drawer` ステータス**: `keymap-drawer regenerated (...)` と表示されれば、`roBa.yaml` と `roBa.svg` も最新化されている。`keymap CLI not found on PATH` または `keymap-drawer update failed` が出た場合は、4-2 のフォールバック手順で手動再生成する。
- 保存が完了すると **`config/roBa.keymap`** がローカルディスク上で更新される。

> Viewer が `Save all` で書き換えるのは原則 `config/roBa.keymap`、加えて `keymap` CLI が PATH にある場合は `keymap-drawer/roBa.yaml` と `keymap-drawer/roBa.svg` の3ファイル。
> 保存直前のファイルは自動的にバックアップされる（UI に表示される `backupPath`）。想定外の保存内容になった場合は、PowerShell でこのバックアップから復元できる:
>
> ```powershell
> Copy-Item <backupPath> config\roBa.keymap -Force
> ```
>
> 保存後、実機にはまだ反映されていない。

---

## 4. Git 反映（commit / push）

### 4-1. 変更ファイルを確認する

```powershell
git status
git diff config/roBa.keymap
```

`config/roBa.keymap` が変更されていることを確認する。

### 4-2. ステージング

通常ケース（`Save all` 実行時に keymap-drawer も自動再生成された場合）:

```powershell
# .keymap と keymap-drawer の3ファイルをまとめてステージ
git add config/roBa.keymap keymap-drawer/roBa.yaml keymap-drawer/roBa.svg
```

`git status` で keymap-drawer に diff が出ていない場合（バインディング変更で見た目が変わらなかった、など）は `config/roBa.keymap` のみで構わない:

```powershell
git add config/roBa.keymap
```

**フォールバック**: `Save all` 後の `keymap-drawer` ステータスが `not found` / `failed` だった場合のみ、手動で再生成する:

```powershell
# まず keymap-drawer を再生成する
keymap parse -c 10 -z config/roBa.keymap | Out-File -Encoding utf8 keymap-drawer/roBa.yaml
keymap draw -d boards/shields/roBa/roBa.dtsi keymap-drawer/roBa.yaml | Out-File -Encoding utf8 keymap-drawer/roBa.svg

# 3ファイルをまとめてステージ
git add config/roBa.keymap keymap-drawer/roBa.yaml keymap-drawer/roBa.svg
```

> keymap-drawer の手動調整が `roBa.yaml` に含まれている場合は、自動／手動どちらの再生成後でも diff を必ず確認してから add する。

### 4-3. コミットとプッシュ

```powershell
git commit -m "Update keymap: <変更内容を簡潔に>"
git push
```

コミットメッセージは英語・日本語どちらでも可。変更の意図が分かるように書く。

---

## 5. GitHub Actions でのビルド確認と成果物取得

### 5-1. Actions の結果を確認する

1. GitHub のリポジトリページを開く。
2. **`Actions`** タブを開く。
3. 最新のワークフロー実行（push 直後に始まる）が **Success（緑のチェック）** になるまで待つ。
4. ビルドに失敗した場合は、ログを開いてエラー内容を確認する。

> **ビルド失敗の主な原因**: `.keymap` の構文エラー、`config/west.yml` の revision 問題、`.overlay` / `.dtsi` の記述ミス。

### 5-2. Artifacts から `.uf2` を取得する

1. 成功したワークフロー実行を開く。
2. ページ下部の **`Artifacts`** セクションを探す。
3. 次のものをダウンロードする:
   - `roBa_L` → 左手側用（エンコーダーがある側）
   - `roBa_R` → 右手側用（トラックボールがある側）
   - `settings_reset` → ペアリング情報リセット用（必要時のみ。8章「よくある失敗」参照）
4. ダウンロードした ZIP を展開し、`.uf2` ファイルを取り出す（ZIP のままドラッグするとブートローダーで認識されない）。

> **左右は必ず同じ Actions 実行の Artifacts から取得すること。** 異なるビルドの `.uf2` を混在させない。

---

## 6. 実機への書き込み手順

> **左右の見分け方（物理）**:
> - **左手側 = エンコーダーが付いている方** → `roBa_L.uf2` を書き込む
> - **右手側 = トラックボールが付いている方** → `roBa_R.uf2` を書き込む
>
> ドライブ名（`XIAO-SENSE` / `UF2BOOT` 等）は左右で同じことが多いので、**ドライブ名ではなく「どちらの半分をUSBに接続したか」で判別する**。

### 6-1. 左手側（roBa_L）への書き込み

1. **左手側（エンコーダーがある方）をUSBケーブルでPCに接続する**（右手側は接続しなくてよい）。
2. **ダブルリセット**: 左手側のリセットボタンを素早く **2回** 押す。
3. Windowsのエクスプローラーに新しいUSBドライブが表示されるのを確認する（`XIAO-SENSE` / `UF2BOOT` / `ZMK` など）。
4. Artifacts から取得した **`roBa_L.uf2`** をそのドライブへドラッグ＆ドロップする。
5. コピー完了後、ドライブが自動的に消えてキーボードが再起動する（正常）。

### 6-2. 右手側（roBa_R）への書き込み

1. **右手側（トラックボールがある方）をUSBケーブルでPCに接続する**（左手側は切り離しておいてよい）。
2. **ダブルリセット**: 右手側のリセットボタンを素早く **2回** 押す。
3. Windowsのエクスプローラーに新しいUSBドライブが表示されるのを確認する。
4. Artifacts から取得した **`roBa_R.uf2`** をそのドライブへドラッグ＆ドロップする。
5. コピー完了後、ドライブが消えてキーボードが再起動する（正常）。

> roBa の左右の役割:
> - **roBa_L**: 左手側・エンコーダーあり
> - **roBa_R**: 右手側・PMW3610トラックボールあり・ZMK Studio 有効側

### 6-3. Windowsの「デバイスが見つかりません」エラーについて

コピー後に次のエラーが出ることがある:

```
0x800701B1: 存在しないデバイスを指定しました。
```

これはコピー中にキーボードが自動再起動してドライブが消えたために起きる表示で、**書き込みが成功していることが多い**。  
動作確認（次章）で新キーマップが反映されていれば、このエラーは無視して問題ない。

---

## 7. 動作確認チェックリスト

書き込み後、以下の項目を順番に確認する。

- [ ] 左手側をUSBまたはBluetooth接続し、文字入力できる
- [ ] 右手側のトラックボールが動く（Bluetooth または USB 経由）
- [ ] 変更したキーが期待通りに動作する
- [ ] 変更していないキーが従来通りに動作する（リグレッションなし）
- [ ] エンコーダー（左側）が正しく動作する
- [ ] レイヤー切り替えが意図通りに動作する
- [ ] コンボ・マクロを変更した場合は、対象のコンボ・マクロが発火する

Bluetooth 接続で確認する場合、以前のペアリングが残っているとズレが起きることがある。問題があれば `settings_reset.uf2` の使用を検討する（次章の「よくある失敗」を参照）。

---

## 8. よくある失敗と対処

| 症状 | 原因の候補 | 対処 |
|---|---|---|
| Viewer で Save all してもキーが変わらない | Git push していない / Actions が失敗している | `git status` で未push差分を確認 / Actions ログを見る |
| Actions が失敗する | `.keymap` 構文エラー | Actions ログでエラー行を確認し `.keymap` を修正 |
| ブートローダーモードに入れない | ダブルリセットのタイミングが速すぎ・遅すぎ | 0.5秒間隔目安でもう一度試す |
| ドライブが現れない | USBケーブルの不良 / 電源問題 | 別のケーブルまたはPCのUSBポートを試す |
| ドライブは出たが `.uf2` コピー後も変わらない | 古い `.uf2` を使った / 左右の取り違え | 同じ Actions 実行のものを正しい側へ再書き込み |
| 左右が接続しない / Bluetooth がつながらない | 異なるバージョンのファームウェア混在 | 左右両方を同じ Artifacts から取得した `.uf2` で書き込み直す |
| ペアリングが壊れた | Bluetooth 設定の不整合 | 同じ Actions 実行の Artifacts から `settings_reset` を取得 → 左右両方に書き込み → 左右それぞれに通常 `.uf2` を書き込み → PC側の旧ペアリング情報を削除して再ペアリング |
| Save all したのに `keymap-drawer/roBa.svg` が古いまま（Actions ビルドにも古い svg が残る） | `keymap` CLI が PATH に無く自動再生成がスキップされた | `Save all` 後の `keymap-drawer` ステータスを確認。`not found` なら 4-2 のフォールバック手順で手動再生成してコミットに含める |
| Save all 結果が想定外で `.keymap` を戻したい | 編集を取り違えた | UI に表示された `backupPath` から復元: `Copy-Item <backupPath> config\roBa.keymap -Force` |
| Viewer が古いキーマップを表示している | ファイルが未保存 / ブラウザキャッシュ | Viewer の `Reload source` で再読み込み（実機からの読み取りではなく、ローカルファイルの再読み込み） |

---

## 9. 運用ルール（ズレ防止）

### 9-1. 正本管理

- **`config/roBa.keymap`（リポジトリ上のファイル）を正本とする。**
- ZMK Studio や Viewer で変更した内容は、必ず `config/roBa.keymap` へ保存して Git 管理に乗せる。
- ローカルに未コミットの変更を長期間放置しない。

### 9-2. 左右の一致管理

- 左右は**必ず同じ Actions ビルド（同じコミット）由来の `.uf2`** を使う。
- 一方だけ更新すると、分割キーボードの通信プロトコル・設定が不整合になる可能性がある。
- **原則として左右セットで書き込む**。

### 9-3. keymap-drawer の更新

- レイアウトの見た目が変わる変更（キー数、レイヤー追加など）では、`keymap-drawer/roBa.yaml` と `keymap-drawer/roBa.svg` も同じコミットに含める。
- Viewer が keymap-drawer を自動更新した場合は、diff を確認してから add する。
- keymap-drawer ファイルはファームウェアに影響しないが、ドキュメントの信頼性のために最新に保つ。

### 9-4. Viewer の位置づけ

- Viewer は `config/roBa.keymap` を読み書きするローカル補助ツール。実機の現在状態を直接読み取る機能はない。
- `Reload source` はローカルファイルの再読み込みのみ。実機から取得する操作ではない。
- Viewer・ZMK Studio・実機の間でズレが生じた場合は、リポジトリの `config/roBa.keymap`（最新コミット）を基準として判断する。
- **ZMK Studio で実機に直接加えた変更は、次回の `.uf2` 書き込みで上書きされて失われる。** Studio での編集は一時的な試用と割り切るか、確定した内容を必ず `config/roBa.keymap` に手で反映してコミットするまで本手順書のフローには戻さないこと。

---

## 運用時の最重要注意 3つ

- **正本は Git 上の `config/roBa.keymap`**: Viewer や ZMK Studio での変更は、必ずファイルに保存してコミット・プッシュするまで実機には反映されない。変更を放置したまま実機と比較しない。
- **左右は同じ Artifacts から取得した `.uf2` を使う**: 左右で異なるコミット・ビルドのファームウェアを混在させると、分割キーボードの同期が崩れる。片側だけ書き込んで終わりにしない。
- **Viewer は実機を読み取れない**: `Reload source` はローカルファイルの再読み込みであり、実機の現在のキーマップを取得する操作ではない。実機の実態を知りたいときは、その実機に最後に書き込んだ `.uf2` のコミットを Git 履歴から確認する。
