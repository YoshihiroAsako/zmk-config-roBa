---
name: cross-ai-call
description: ユーザーが他 AI(Codex / Claude Code / Cursor)の直接呼び出しや直接レビューを依頼したときに使用する。各呼び出しの承認・サブスク内確認・ツール制限・原文保存を扱う。起案時の design-doc 案Fを除き、他 AI の利用を自発提案しない。
---

<!-- 配布物。編集は必ず原本(ai-workspace-rules/skills/cross-ai-call)側で行い、
     各リポジトリ側では変更しないこと。distribute.sh で同期される。 -->

# 他 AI の直接呼び出し(cross-ai-call)

正本は `ai-workspace-rules/docs/design/20260930-cross-ai-invoke.md`(承認済み。案 C)。本スキルは `AGENTS.md` §6 の「他 AI の呼び出し」の手順であり、矛盾したら正本と §6 が優先する。レビューの記録は `review-round` スキルに従う。

## Orca との適用境界

本スキルは他 AI の CLI を**直接**呼び、同梱した依頼文だけへの意見を得る経路である。`orca orchestration` で同じ AI または他 AI をワーカーとして起動し、作業場所のファイルを読ませて仕事を委譲する経路は、ユーザーが承認した具体的な Run 計画と `orca-orchestration-run` スキルに従う。Orca の Run 承認を本スキルの1回ごとの承認へ流用せず、本スキルの Claude Code だけを呼ばれる側とする合否を Orca ワーカーの資格判定へ流用しない。Orca を依頼された際の起動前の AI 候補提示は同スキルの範囲で行い、ユーザーが頼んでいない意見照会・レビューや次の回は提案しない。

## 前提

- 使うのは、ユーザーが他 AI の呼び出し(その AI へのレビュー依頼を含む)を依頼したときだけ。自発提案の例外は `design-doc` の起案時の案Fの1行だけで、他 AI の利用・レビュー・次の回を追加提案しない。案Fは起動承認ではない。
- 1 回の呼び出しごとに「承認の提示」を示し、ユーザーの明示承認を得る。「もう 1 回」は新しい承認とし、承認を次の回へ持ち越さない。
- 対象は Codex(`codex`)・Claude Code(`claude`)・Cursor(`cursor-agent` / `agent`)の 3 つ。ほかの AI は、同じ条件の確かめ方を正本で決めるまで呼ばない。
- 呼ばれる側にできるのは、正本の試験に合格した AI だけ(2026-09-30 時点: Claude Code は合格、Codex と Cursor は不合格)。このため使える方向は Codex → Claude Code と Cursor → Claude Code の 2 つで、Claude Code から他 AI は呼ばない。

## サブスク内の確認(呼び出しの直前に毎回)

| AI | 確かめること |
|---|---|
| Codex | `codex login status` が「Logged in using ChatGPT」。`OPENAI_API_KEY`・`CODEX_API_KEY` が未設定 |
| Claude Code | `claude auth status` の `authMethod` が `claude.ai`。`ANTHROPIC_API_KEY`・`ANTHROPIC_AUTH_TOKEN` が未設定 |
| Cursor | `cursor-agent status` がログイン済みで、`cursor-agent about` の `Subscription Tier` が有料プラン。`CURSOR_API_KEY` が未設定 |

- 追加購入・自動補充・従量課金(Claude の usage credits、ChatGPT の追加クレジット、Cursor の従量課金)は CLI から見えない。正本の未決事項に、その AI の「無効を確認した日」が記録されていることを確かめる。記録の無い AI は呼ばない。ユーザーが設定を変えたと言ったら、先に記録の更新を頼む。
- 満たさないときは呼ばずに報告し、手作業(依頼文をユーザーが貼る形)へ戻す。
- API キー認証に切り替わる起動方法は使わない(Claude の `--bare`、Cursor の `--api-key` など)。

## 承認の提示(1 回ごと)

呼び出しの前に次を示し、明示承認を待つ。

1. 呼ぶ AI・モデル・エフォート
2. 送る本文の全文を置いたファイルと、その本文に秘密情報(鍵・トークン・パスワード・個人情報)と実データが無いことを確かめた結果
3. 実行するコマンド(下の起動形)
4. 原文の保存先
5. 使うサブスクと、上の確認の結果
6. 呼び出し側の確認設定があるか(無い方向なら「仕組みの確認なし」と書く)

## 依頼文の作り方(本文を同梱する)

- 呼ばれる側は依頼文だけで答える。判定対象や関連ファイルをパスで渡さず、中身を同梱する。
- 他 AI レビューでは、`review-round` の `pack` が出した依頼文、判定対象の本文(`rN-subject.md`)、根拠になる関連箇所の抜粋(ファイル:行つき)、呼び出し側の実測値(`git rev-parse HEAD`・`git status --porcelain` など)を 1 つのファイルに束ね、`reviews/<件名>/rN-bundle-<reviewer>.md` に置く。
- 束ねたファイルの冒頭に次を書く。
  - 受け手はファイルを読めず、コマンドも実行できない。同梱した本文と抜粋だけで判定する。
  - 呼び出し側が渡した実測と、受け手自身の推測を分けて書く。
  - 他の AI を呼ばない。別の AI の意見が要ると考えたら、その旨を返答に書く。

## 呼ばれる側の起動形

- 空の一時フォルダを作り、束ねた依頼文だけを置いて作業フォルダにする。終わったら消す(同じ作業で作った一時ファイル)。
- 書き込み・シェル・プラグイン・MCP・他 AI の呼び出しを止める。起動時のフック・指示ファイル・メモリの自動読込も止める。

| AI | 起動形(試験の結果は正本の未決事項) | 根拠 |
|---|---|---|
| Claude Code | `claude -p --tools "" --strict-mcp-config --no-session-persistence --model <model> --settings '{"disableAllHooks":true,"autoMemoryEnabled":false,"pluginConfigs":{"agents-md@builtin":{"options":{"instructionFiles":"managed-only"}}}}'`(依頼文は標準入力) | `--tools ""` で全ツール無効(CLI ヘルプ)。`disableAllHooks` はその回のフックを止める(公式 hooks)。`autoMemoryEnabled` と `instructionFiles` は自動読込を止める(公式 memory) |
| Codex | **呼ばれる側にしない。**2026-09-30 のサンドボックス復旧後の再試験で、シェル・プラグイン・スキル・指示ファイルなどを止めた起動形でも、作業用エージェントを作るツール(`spawn_agent`)が残り、止める設定が無かった。試しに作らせると呼び出しまで進み、`--ephemeral` の副作用で失敗しただけだった | 正本の未決事項(試験の結果)。試験の起動形と記録は `ai-workspace-rules/reviews/20260930-cross-ai-codex-retest/` |
| Cursor | **呼ばれる側にしない。**2026-09-30 の試験で、`--mode ask` でもワークスペースの外のファイルを読めた。Windows では Cursor のサンドボックスも使えない | 正本の未決事項(試験の結果) |

- 試験の合格条件: 一時フォルダの外(リポジトリや `.env.local`)を読めない。フックと自動読込が止まる。シェルと他 AI の呼び出し(その AI 自身の作業用エージェントを含む)ができない。サブスク認証のまま返る。外を読めた AI と、作業用エージェントを止められない AI は呼ばれる側から外す。
- 合否は機械の記録(起動時のツール一覧・ツール使用の記録・フックの記録・出力の中身)で判定する。呼ばれた AI の自己申告は使わない(試験で、使えないシェルを「実行できた」と答えた例がある)。
- 試験の結果は、正本の未決事項に AI ごとに記録する。
- Claude を呼ぶと、ユーザーが対話中の Claude と同じサブスク枠を使う。

## 原文の保存と連鎖

- 返ってきた原文は加工せずにファイルへ保存する。他 AI レビューは `review-round` の `recv` で登録する。保存したら一時フォルダを消す。
- 呼ばれた AI には別の AI を呼ばせない。返答に「別の AI の意見が要る」とあれば、ユーザーと対話している AI がそれを示し、改めて承認を得て自分で呼ぶ。

## 呼び出し側の確認設定(仕組みの歯止め)

呼び出し側の AI ごとに、他の CLI を実行するたびに確認を出す設定を入れる。ユーザー設定であり配布しない。この PC の状態は正本に記録する。

| 呼び出し側 | 設定 |
|---|---|
| Claude Code | `~/.claude/settings.json` の `permissions.ask` に `Bash(codex *)`・`Bash(cursor-agent *)`・`Bash(agent *)` と、同じ形の `PowerShell(...)`。明示的な ask ルールは bypass モードでも確認を出す(公式 permission-modes) |
| Codex | `~/.codex/rules/default.rules` に `prefix_rule(pattern=["claude"], decision="prompt")` など。bash 系の包みは中のコマンドまで照合する(公式 rules)。**PowerShell 経由の呼び出しには効かない**(2026-09-30 の試験) |
| Cursor | CLI は `~/.cursor/cli-config.json` の `allow` に他の CLI を載せない。**Orca の管理下では、Orca のフックが常に許可を返すため確認は出ない**(2026-09-30 の試験。IDE・CLI とも) |

- 設定が無い、または効かない方向は、チャットでの承認だけで運用する。その方向は承認の提示に「仕組みの確認なし」と書く。
- 呼び出し側で確認が出る仕組みがあるのは Claude Code だけだが、呼ばれる側が Claude Code だけのため、Claude Code から呼ぶ方向は無い。使える 2 方向(Codex → Claude Code、Cursor → Claude Code)はどちらも「仕組みの確認なし」で、チャットでの承認だけで運用する。

## しないこと

- 承認なしに呼ぶ。承認を次の回へ持ち越す。
- API キーや従量課金に切り替わる起動方法を使う。
- 呼ばれる側に書き込み・シェル・他 AI の呼び出しを許す起動形を使う(Cursor の `-p` を `--mode` なしで使う、`--force`・`--yolo`、Codex の `danger-full-access`・`--dangerously-bypass-approvals-and-sandbox` など)。
- 呼ばれた AI の返答を額面で受ける(レビューは `review-round` の手順で実物と照合する)。
