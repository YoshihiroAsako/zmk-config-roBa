# Trackball Layer Settings 開発計画用 AI 指示スクリプト

このドキュメントは、roBa Keymap Viewer に `automouse-layer` / `scroll-layers` 編集機能を追加するための「計画立案専用」プロンプトです。
このまま AI チャットに貼り付けて使えます。

---

## 使い方

1. 新しいチャットを開く
2. `@AGENTS.md` と `@docs/current-work-status.md` を添付する
3. 下の「計画指示プロンプト」を貼って送信する

---

## 計画指示プロンプト（コピペ用）

```md
このリポジトリ `zmk-config-roBa` で、roBa Keymap Viewer に trackball layer settings 編集機能を追加するための実装計画を作ってください。回答は日本語でお願いします。

## 目的
- `config/roBa.keymap` の `&trackball { ... }` ブロックにある次の設定を、Viewer UI から編集できるようにしたい。
  - `automouse-layer = <N>;`
  - `scroll-layers = <...>;`
- まずは「計画のみ」。この依頼ではコード編集はしないでください。

## 前提
- リポジトリのルールは `AGENTS.md` を最優先で遵守してください。
- 現状の進捗は `docs/current-work-status.md` を確認してください。
- 既存の Save all / pending changes / source-range editing の設計を壊さずに拡張する方針で考えてください。
- 正本は `config/roBa.keymap` です。

## 必須で調べてほしいこと
1. 現在の Viewer 実装で、`.keymap` のどこまで構造化パースされているか（特に `&trackball` ブロックの扱い）
2. `Save all` の変更表現（pending change kind）と適用経路
3. source-range editing の既存 helper を再利用できるか
4. バリデーションをどこに追加するのが最も一貫的か
5. UI の配置候補（新規タブ / Settings セクション / 既存パネル拡張）

## 期待する成果物（出力フォーマット）
以下の見出しで、実装計画を具体的に出してください。

1. 現状整理（関連ファイルと責務）
2. 実装方針（最小スコープ）
3. データモデル案（pending change の kind / payload）
4. UI設計案（ユーザーフロー・入力形式・エラー表示）
5. 保存ロジック設計（差分適用ポイント、衝突時の挙動）
6. バリデーション設計（layer index 範囲、重複、未定義など）
7. テスト計画（unit / integration / 手動確認）
8. 段階的実装ステップ（Step 1, 2, 3...）
9. リスクと回避策
10. 実装着手用チェックリスト

## 制約
- 既存機能（bindings/combo/macro/layer rename/save/backups）への影響を最小化すること。
- `scroll-layers` は将来の複数レイヤー対応を見据え、拡張性を意識して計画すること。
- ただし初期実装は過剰設計せず、MVP を先に完了できる粒度にすること。

最後に、提案した計画について「最短で価値を出すMVP案」と「将来拡張案」を分けてまとめてください。
```

---

## 補足

- このプロンプトは「計画立案」専用です。実装フェーズでは別途「この計画で実装して」と依頼してください。
- 先に AI にコードを書かせるより、上記フォーマットで計画を固定してから実装に入ると手戻りを減らせます。
