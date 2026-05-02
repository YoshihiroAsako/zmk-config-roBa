# Windows JIS 記号実機検証シート

## ZMK Studio 用逆引き表

Windows のキーボードレイアウトを日本語キーボード 106/109 として使う場合、ZMK Studio 上の記号名と実際に入力される記号は一致しないことがある。

ZMK Studio で記号を設定するときは、まずこの表で「出したい文字」から「ZMK Studio で選ぶ項目」を逆引きする。

| Windows JIS で出したい文字 | ZMK Studio で選ぶ項目の目安 | ZMK binding | メモ |
|---|---|---|---|
| `-` | `Minus` | `&kp MINUS` |  |
| `+` | `Semicolon and Colon` + `L-Shift` | `&kp COLON` | JIS の `;` / `+` キー相当 |
| `^` | `Equal and Plus` | `&kp EQUAL` |  |
| `&` | `Keyboard 6 and Caret` + `L-Shift` | `&kp CARET` | ZMK Studio の `AMPERSAND` ではない |
| `~` | `Equal and Plus` + `L-Shift` | `&kp PLUS` |  |
| `(` | `Keyboard 8 and Asterisk` + `L-Shift` | `&kp ASTERISK` | 実機で重点確認 |
| `)` | `Keyboard 9 and Left Parenthesis` + `L-Shift` | `&kp LEFT_PARENTHESIS` |  |
| `/` | `Slash` | `&kp SLASH` |  |
| `*` | `Single Quote / Double Quotes` + `L-Shift` | `&kp DOUBLE_QUOTES` | ZMK Studio の UI では quote 系として表示される可能性あり |
| `_` | `International1 / Ro` + `L-Shift` | `&kp LS(INT_RO)` | 実機で重点確認 |
| `!` | `Keyboard 1 and Exclamation` + `L-Shift` | `&kp EXCLAMATION` |  |
| `@` | `Left Bracket` | `&kp LEFT_BRACKET` |  |
| `#` | `Keyboard 3 and Hash` + `L-Shift` | `&kp HASH` |  |
| `$` | `Keyboard 4 and Dollar` + `L-Shift` | `&kp DOLLAR` |  |
| `%` | `Keyboard 5 and Percent` + `L-Shift` | `&kp PERCENT` |  |
| `.` | `Period` | `&kp PERIOD` |  |
| `=` | `Minus and Underscore` + `L-Shift` | `&kp UNDERSCORE` | ZMK Studio の `Equal` ではない |
| `[` | `Right Bracket` | `&kp RIGHT_BRACKET` | 実機で重点確認 |
| `]` | `Backslash` | `&kp BACKSLASH` |  |
| `{` | `Right Bracket` + `L-Shift` | `&kp RIGHT_BRACE` | 実機で重点確認 |
| `}` | `Backslash` + `L-Shift` | `&kp PIPE` |  |
| `\` | `International3 / Yen` | `&kp INT_YEN` | 実機で重点確認 |
| `\|` | `International3 / Yen` + `L-Shift` | `&kp LS(INT_YEN)` | 実機で重点確認 |
| `"` | `Keyboard 2 and At` + `L-Shift` | `&kp AT_SIGN` | combo 用。JIS では `"` |

注意: ZMK Studio の表示名は UI のバージョンやカテゴリ名によって少し変わる可能性がある。迷った場合は `ZMK binding` 欄を基準にする。

このシートは、roBa の現在のキーマップが Windows + JIS 配列でどの文字として入力されるかを記録するためのものです。

## 目的

ZMK は基本的に US 配列由来の HID キーコードを送ります。一方、Windows が日本語キーボード 106/109 として解釈している場合、記号が roBa 側の表示と違う文字として入力されることがあります。

まずは補正せず、実機で「現在どう出るか」を記録します。その後、確定した実出力に基づいて `NUM` レイヤーや combo を補正します。

検証用に、Layer 3 `ARROW` の通常キー位置へ下表 No. 1-23 の記号を左上から順番に配置しています。Layer 0 / Layer 1 は変更していません。

## 検証前提

- Windows のキーボードレイアウト: 日本語キーボード 106/109
- 入力先: メモ帳など、装飾やショートカット解釈が少ないテキスト欄
- IME: できれば直接入力モード
- 使うファームウェア: 専用 `SCROLL` キー (`&mo 5`) でスクロール成功確認済みの版

## 検証方法

1. メモ帳などを開く。
2. roBa の Layer 3 `ARROW` を押しながら、下表 No. 1-23 のキーを左上から順番に 1 つずつ入力する。
3. 実際に出た文字を「実機結果」欄に記録する。
4. combo は default layer で同時押しして確認する。

## Layer 3 記号検証

| No. | roBa 表示 | ZMK binding | Windows JIS 予測 | 実機結果 | メモ |
|---:|---|---|---|---|---|
| 1 | `-` | `&kp MINUS` | `-` | - |  |
| 2 | `+` | `&kp PLUS` | `~` | ~ |  |
| 3 | `^` | `&kp CARET` | `&` | & |  |
| 4 | `&` | `&kp AMPERSAND` | `'` | ' |  |
| 5 | `~` | `&kp TILDE` | 要検証 | 不明、shiftのような動き | 半角/全角などに化ける可能性 |
| 6 | `(` | `&kp LEFT_PARENTHESIS` | `)` | ) |  |
| 7 | `)` | `&kp RIGHT_PARENTHESIS` | 予測困難/要検証 | 不明 | JIS では Shift+0 が特殊 |
| 8 | `/` | `&kp SLASH` | `/` | / |  |
| 9 | `*` | `&kp ASTERISK` | `(` | () |  |
| 10 | `_` | `&kp UNDERSCORE` | `=` | = |  |
| 11 | `!` | `&kp EXCLAMATION` | `!` | ! |  |
| 12 | `@` | `&kp AT_SIGN` | `"` | " |  |
| 13 | `#` | `&kp HASH` | `#` | # |  |
| 14 | `$` | `&kp DOLLAR` | `$` | $ |  |
| 15 | `%` | `&kp PERCENT` | `%` | % |  |
| 16 | `.` | `&kp PERIOD` | `.` | . |  |
| 17 | `=` | `&kp EQUAL` | `^` | ^ |  |
| 18 | `[` | `&kp LEFT_BRACKET` | `@` | @ |  |
| 19 | `]` | `&kp RIGHT_BRACKET` | `[` | [] |  |
| 20 | `{` | `&kp LEFT_BRACE` | `` ` `` | ` |  |
| 21 | `}` | `&kp RIGHT_BRACE` | `{` | {} |  |
| 22 | `\` | `&kp BACKSLASH` | `]` | ] |  |
| 23 | `\|` | `&kp PIPE` | `}` | } |  |

## Combo 検証

| Combo 名 | 押すキーの目安 | ZMK binding | Windows JIS 予測 | 実機結果 | メモ |
|---|---|---|---|---|---|
| `double_quotation` | `J` + `K` 同時押し | `&kp DOUBLE_QUOTES` | `*` | jk |  |
| `eq` | `C` + `V` 同時押し | `&kp EQUAL` | `^` | ^ |  |

## Windows JIS 補正案

実機結果と Windows JIS の一般的な HID 解釈に基づき、Layer 2 `NUM` は次の方針で補正する。

| 出したい文字 | 採用する ZMK binding | 根拠 |
|---|---|---|
| `-` | `&kp MINUS` | 実機で表示どおり |
| `+` | `&kp COLON` | JIS の `;` / `+` キー相当 |
| `^` | `&kp EQUAL` | 実機で `&kp EQUAL` が `^` |
| `&` | `&kp CARET` | 実機で `&kp CARET` が `&` |
| `~` | `&kp PLUS` | 実機で `&kp PLUS` が `~` |
| `(` | `&kp ASTERISK` | JIS の Shift+8 相当。実機結果 `()` は追試候補 |
| `)` | `&kp LEFT_PARENTHESIS` | 実機で `&kp LEFT_PARENTHESIS` が `)` |
| `/` | `&kp SLASH` | 実機で表示どおり |
| `*` | `&kp DOUBLE_QUOTES` | JIS の `:` / `*` キー相当。`&kp AT_SIGN` は実機で `"` になった |
| `_` | `&kp LS(INT_RO)` | JIS の「ろ」キー Shift 相当 |
| `!` | `&kp EXCLAMATION` | 実機で表示どおり |
| `@` | `&kp LEFT_BRACKET` | 実機で `&kp LEFT_BRACKET` が `@` |
| `#` | `&kp HASH` | 実機で表示どおり |
| `$` | `&kp DOLLAR` | 実機で表示どおり |
| `%` | `&kp PERCENT` | 実機で表示どおり |
| `.` | `&kp PERIOD` | 実機で表示どおり |
| `=` | `&kp UNDERSCORE` | 実機で `&kp UNDERSCORE` が `=` |
| `[` | `&kp RIGHT_BRACKET` | 実機で `&kp RIGHT_BRACKET` が `[` と推定。結果 `[]` は追試候補 |
| `]` | `&kp BACKSLASH` | 実機で `&kp BACKSLASH` が `]` |
| `{` | `&kp RIGHT_BRACE` | 実機で `&kp RIGHT_BRACE` が `{` と推定。結果 `{}` は追試候補 |
| `}` | `&kp PIPE` | 実機で `&kp PIPE` が `}` |
| `\` | `&kp INT_YEN` | JIS の Yen / backslash キー相当。要実機確認 |
| `\|` | `&kp LS(INT_YEN)` | JIS の Yen / pipe キー Shift 相当。要実機確認 |

combo は次の方針で補正する。

| Combo 名 | 修正後の押すキー | 修正後の ZMK binding | 期待出力 |
|---|---|---|---|
| `double_quotation` | `J` + `K` | `&kp AT_SIGN` | `"` |
| `eq` | `C` + `V` | `&kp UNDERSCORE` | `=` |

次回の実機検証では、Layer 2 `NUM` で表示どおりに出るかを確認する。特に `(` / `[` / `{` / `_` / `\` / `\|` と `J` + `K` combo を重点確認する。

## 補正後再検証

補正後ファームウェアを書き込んだら、Windows JIS 環境で Layer 2 `NUM` を押しながら下表を順番に確認する。

| No. | roBa 表示 | 現在の ZMK binding | 期待出力 | 実機結果 | 判定 | メモ |
|---:|---|---|---|---|---|---|
| 1 | `-` | `&kp MINUS` | `-` | - |  |  |
| 2 | `+` | `&kp COLON` | `+` | + |  |  |
| 3 | `^` | `&kp EQUAL` | `^` | ^ |  |  |
| 4 | `&` | `&kp CARET` | `&` | & |  |  |
| 5 | `~` | `&kp PLUS` | `~` | ~ |  |  |
| 6 | `(` | `&kp ASTERISK` | `(` | ( |  | 重点確認 |
| 7 | `)` | `&kp LEFT_PARENTHESIS` | `)` | ) |  |  |
| 8 | `/` | `&kp SLASH` | `/` | / |  |  |
| 9 | `*` | `&kp DOUBLE_QUOTES` | `*` |  |  | 要再確認 |
| 10 | `_` | `&kp LS(INT_RO)` | `_` | _ |  | 重点確認 |
| 11 | `!` | `&kp EXCLAMATION` | `!` | ! |  |  |
| 12 | `@` | `&kp LEFT_BRACKET` | `@` | @ |  |  |
| 13 | `#` | `&kp HASH` | `#` | # |  |  |
| 14 | `$` | `&kp DOLLAR` | `$` | $ |  |  |
| 15 | `%` | `&kp PERCENT` | `%` | % |  |  |
| 16 | `.` | `&kp PERIOD` | `.` | . |  |  |
| 17 | `=` | `&kp UNDERSCORE` | `=` | = |  |  |
| 18 | `[` | `&kp RIGHT_BRACKET` | `[` | [ |  | 重点確認 |
| 19 | `]` | `&kp BACKSLASH` | `]` | ] |  |  |
| 20 | `{` | `&kp RIGHT_BRACE` | `{` | { |  | 重点確認 |
| 21 | `}` | `&kp PIPE` | `}` | } |  |  |
| 22 | `\` | `&kp INT_YEN` | `\` | \ |  | 重点確認 |
| 23 | `\|` | `&kp LS(INT_YEN)` | `\|` | `|` |  | 重点確認 |

combo も補正後ファームウェアで再確認する。

| Combo 名 | 押すキー | 現在の ZMK binding | 期待出力 | 実機結果 | 判定 | メモ |
|---|---|---|---|---|---|---|
| `double_quotation` | `J` + `K` 同時押し | `&kp AT_SIGN` | `"` | " | OK | 重点確認 |
| `eq` | `C` + `V` 同時押し | `&kp UNDERSCORE` | `=` | = | OK |  |

## 確認後にやること

実機結果が埋まったら、以下を判断します。

- Windows JIS でよく使う記号を優先して補正する。
- ZMK 標準の `INT_RO` / `INT_YEN` が使えるため、`\` / `|` / `_` は標準名ベースの補正を優先する。
- Mac / モバイル向けの副作用が大きい場合は、Windows JIS 用レイヤーと補助レイヤーで分ける。
