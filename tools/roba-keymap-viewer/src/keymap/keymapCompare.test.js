import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseKeymap } from "./parseKeymap.js";
import { compareKeymaps } from "./keymapCompare.js";

const source = readFileSync(new URL("../../../../config/roBa.keymap", import.meta.url), "utf8");
const original = parseKeymap(source);

describe("バックアップとの違い", () => {
  it("同じ内容なら違いなし。コメントだけの違いも違いなし", () => {
    assert.deepEqual(compareKeymaps(original, original), []);
    assert.deepEqual(compareKeymaps(original, parseKeymap(`// memo\n${source}`)), []);
  });

  it("キー・レイヤー名・コンボ・マクロ・トラックボールの違いを文章にする", () => {
    const backup = parseKeymap(source
      .replace("&kp Q ", "&kp A ")
      .replace("FUNCTION {", "FN {")
      .replace("key-positions = <11 12>;", "key-positions = <11 13>;")
      .replace("&to 0 &macro_param_1to1", "&to 1 &macro_param_1to1")
      .replace("automouse-layer = <4>;", "automouse-layer = <5>;"));
    const texts = compareKeymaps(original, backup).map((item) => item.text);
    assert.ok(texts.includes("default_layer キー 0: &kp Q → &kp A"));
    assert.ok(texts.includes("レイヤー 1 の名前: FUNCTION → FN"));
    assert.ok(texts.some((text) => text.startsWith("コンボ tab:") && text.includes("11+13")));
    assert.ok(texts.some((text) => text.startsWith("マクロ to_layer_0:")));
    assert.ok(texts.includes("自動マウスのレイヤー: 4 → 5"));
  });
});
