import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { describeBinding } from "./bindingDisplay.js";
import { countDtsPhysicalKeys, parseKeymap } from "./parseKeymap.js";
import { buildMarkdown } from "../export/markdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

describe("roBa keymap parser", () => {
  it("parses the canonical keymap counts used by the read-only MVP", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);

    assert.equal(parsed.layers.length, 7);
    assert.deepEqual(
      parsed.layers.map((layer) => layer.name),
      ["default_layer", "FUNCTION", "NUM", "ARROW", "MOUSE", "SCROLL", "layer_6"],
    );
    assert.deepEqual(
      parsed.layers.map((layer) => layer.bindings.length),
      [43, 43, 43, 43, 43, 43, 43],
    );
    assert.equal(parsed.combos.length, 5);
    assert.equal(parsed.macros.length, 1);
    assert.equal(parsed.behaviors.some((behavior) => behavior.name === "lt_to_layer_0"), true);
    assert.equal(parsed.layers.flatMap((layer) => layer.sensorBindings).length, 2);
  });

  it("keeps important roBa bindings visible as raw binding expressions", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const layerNames = parsed.layers.map((layer) => layer.name);
    const defaultLayer = parsed.layers[0];
    const numLayer = parsed.layers[2];

    assert.equal(defaultLayer.bindings[36], "&mo 5");
    assert.equal(describeBinding(defaultLayer.bindings[36], layerNames).display, "SCROLL");
    assert.equal(defaultLayer.bindings[37], "&lt_to_layer_0 6 INT_HENKAN");
    assert.equal(numLayer.bindings[29], "&kp RIGHT_BRACKET");
    assert.equal(describeBinding(numLayer.bindings[33], layerNames).display, "\\");
  });

  it("shows known Windows JIS output labels for symbol keycodes", () => {
    assert.equal(describeBinding("&kp COLON").display, "+");
    assert.equal(describeBinding("&kp SQT").display, ":");
    assert.equal(describeBinding("&kp ASTERISK").display, "(");
    assert.equal(describeBinding("&kp LEFT_PARENTHESIS").display, ")");
    assert.equal(describeBinding("&kp DOUBLE_QUOTES").display, "*");
    assert.equal(describeBinding("&kp AMPERSAND").display, "'");
    assert.equal(describeBinding("&kp LEFT_BRACKET").display, "@");
    assert.equal(describeBinding("&kp RIGHT_BRACKET").display, "[");
    assert.equal(describeBinding("&kp RIGHT_BRACE").display, "{");
    assert.equal(describeBinding("&kp BACKSLASH").display, "]");
    assert.equal(describeBinding("&kp PIPE").display, "}");
    assert.equal(describeBinding("&kp LS(INT_RO)").display, "_");
    assert.equal(describeBinding("&kp LS(INT_YEN)").display, "|");
  });

  it("keeps uncertain Windows JIS symbol keycodes visibly marked", () => {
    const tilde = describeBinding("&kp TILDE");
    const rightParenthesis = describeBinding("&kp RIGHT_PARENTHESIS");

    assert.equal(tilde.display, "~");
    assert.match(tilde.note, /needs verification/);
    assert.equal(rightParenthesis.display, ")");
    assert.match(rightParenthesis.note, /needs verification/);
  });

  it("counts the DTS physical layout keys and emits Markdown from parsed data", async () => {
    const keymapSource = await readRepoFile("config/roBa.keymap");
    const dtsiSource = await readRepoFile("boards/shields/roBa/roBa.dtsi");
    const parsed = parseKeymap(keymapSource);
    const markdown = buildMarkdown(parsed);

    assert.equal(countDtsPhysicalKeys(dtsiSource), 43);
    assert.match(markdown, /## Layer 0: default_layer/);
    assert.match(markdown, /\| 36 \| SCROLL \| `&mo 5` \| momentary \|/);
    assert.match(markdown, /## Combos/);
    assert.match(markdown, /\| double_quotation \| 18 \+ 19 \| `&kp AT_SIGN` \|/);
    assert.match(markdown, /## Sensor Bindings/);
  });
});
