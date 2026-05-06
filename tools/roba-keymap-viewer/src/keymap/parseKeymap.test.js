import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { describeBinding } from "./bindingDisplay.js";
import { countDtsPhysicalKeys, parseKeymap, parseTrackballSettings, replaceBinding, replaceBindings } from "./parseKeymap.js";
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
      ["default_layer", "FUNCTION", "NUM", "ARROW", "MOUSE", "SCROLL", "BT"],
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

  it("shows nested keypress modifiers without hiding the base key", () => {
    assert.equal(describeBinding("&kp LC(LS(PSCRN))").display, "C+S+PSCRN");
    assert.equal(describeBinding("&kp RC(RS(TAB))").display, "RC+RS+TAB");
  });

  it("shows common consumer keycodes with compact labels", () => {
    assert.equal(describeBinding("&kp C_VOL_UP").display, "Vol+");
    assert.equal(describeBinding("&kp C_VOL_DN").display, "Vol-");
    assert.equal(describeBinding("&kp C_NEXT").display, "Next");
    assert.equal(describeBinding("&kp C_PREV").display, "Prev");
    assert.equal(describeBinding("&kp C_BRI_INC").display, "Bri+");
    assert.equal(describeBinding("&kp C_BRI_DEC").display, "Bri-");
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

  it("tracks source ranges for layer binding expressions without changing display bindings", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const defaultLayer = parsed.layers[0];

    assert.equal(defaultLayer.bindingEntries.length, defaultLayer.bindings.length);
    assert.equal(defaultLayer.bindingEntries[0].raw, "&kp Q");
    assert.equal(defaultLayer.bindings[0], "&kp Q");
    assert.equal(
      source.slice(defaultLayer.bindingEntries[0].sourceRange.start, defaultLayer.bindingEntries[0].sourceRange.end),
      "&kp Q",
    );
    assert.equal(defaultLayer.bindingEntries[37].raw, "&lt_to_layer_0 6 INT_HENKAN");
  });

  it("tracks source ranges for combo nodes and combo binding expressions", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const combo = parsed.combos.find((item) => item.name === "double_quotation");

    assert.ok(combo);
    assert.deepEqual(combo.positions, [18, 19]);
    assert.equal(combo.binding, "&kp AT_SIGN");
    assert.equal(source.slice(combo.sourceRange.start, combo.sourceRange.end).trim(), combo.raw);
    assert.equal(source.slice(combo.keyPositionsRange.start, combo.keyPositionsRange.end).trim(), "18 19");
    assert.equal(source.slice(combo.bindingEntry.sourceRange.start, combo.bindingEntry.sourceRange.end), "&kp AT_SIGN");
    assert.deepEqual(combo.layers, []);
    assert.equal(combo.layersRange, undefined);
    assert.equal(combo.timeoutMsRange, undefined);
    assert.equal(combo.timeoutMs, 50);
    assert.ok(combo.bodyRange);
    assert.equal(source[combo.bodyRange.end], "}");
  });

  it("tracks source ranges for macro nodes and macro binding expressions", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const macro = parsed.macros.find((item) => item.name === "to_layer_0");

    assert.ok(macro);
    assert.equal(macro.bindingEntries.length, 3);
    assert.equal(macro.bindingEntries[0].raw, "&to 0");
    assert.equal(macro.bindingEntries[2].raw, "&kp MACRO_PLACEHOLDER");
    assert.equal(
      source.slice(macro.bindingEntries[2].sourceRange.start, macro.bindingEntries[2].sourceRange.end),
      "&kp MACRO_PLACEHOLDER",
    );
    assert.ok(macro.bindingsRange);
    assert.ok(macro.bodyRange);
    assert.equal(source[macro.bodyRange.end], "}");
    assert.equal(macro.waitMsRange, undefined);
    assert.equal(macro.tapMsRange, undefined);
    assert.equal(macro.waitMs, null);
    assert.equal(macro.tapMs, null);
  });

  it("tracks source ranges for layer name tokens", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);

    for (const layer of parsed.layers) {
      assert.ok(layer.nameRange, `${layer.name} should have nameRange`);
      assert.equal(source.slice(layer.nameRange.start, layer.nameRange.end), layer.name);
    }

    const renamed = `${source.slice(0, parsed.layers[1].nameRange.start)}FN${source.slice(parsed.layers[1].nameRange.end)}`;
    const reparsed = parseKeymap(renamed);
    assert.equal(reparsed.layers[1].name, "FN");
    assert.deepEqual(
      reparsed.layers.map((layer) => layer.bindings.length),
      parsed.layers.map((layer) => layer.bindings.length),
    );
  });

  it("captures wait-ms and tap-ms ranges when macros define them", () => {
    const source = `/
{
    macros {
        sample: sample {
            compatible = "zmk,behavior-macro";
            #binding-cells = <0>;
            wait-ms = <30>;
            tap-ms = <40>;
            bindings = <&kp A &kp B>;
        };
    };
};
`;
    const parsed = parseKeymap(source);
    const macro = parsed.macros[0];

    assert.equal(macro.waitMs, 30);
    assert.ok(macro.waitMsRange);
    assert.equal(source.slice(macro.waitMsRange.start, macro.waitMsRange.end), "30");
    assert.equal(macro.tapMs, 40);
    assert.ok(macro.tapMsRange);
    assert.equal(source.slice(macro.tapMsRange.start, macro.tapMsRange.end), "40");
  });

  it("captures timeout-ms and layers ranges when combos define them", () => {
    const source = `/
{
    combos {
        compatible = "zmk,combos";
        sample {
            timeout-ms = <120>;
            key-positions = <0 1>;
            bindings = <&kp A>;
            layers = <0 1>;
        };
    };
};
`;
    const parsed = parseKeymap(source);
    const combo = parsed.combos[0];

    assert.equal(combo.timeoutMs, 120);
    assert.ok(combo.timeoutMsRange);
    assert.equal(source.slice(combo.timeoutMsRange.start, combo.timeoutMsRange.end), "120");
    assert.deepEqual(combo.layers, [0, 1]);
    assert.ok(combo.layersRange);
    assert.equal(source.slice(combo.layersRange.start, combo.layersRange.end), "0 1");
  });

  it("replaces one key binding while preserving every other byte of the keymap source", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const range = parsed.layers[0].bindingEntries[0].sourceRange;
    const updated = replaceBinding(source, range, "&kp B");

    assert.equal(updated, `${source.slice(0, range.start)}&kp B${source.slice(range.end)}`);

    const reparsed = parseKeymap(updated);
    assert.equal(reparsed.layers[0].bindings[0], "&kp B");
    assert.deepEqual(
      reparsed.layers.map((layer) => layer.bindings.length),
      parsed.layers.map((layer) => layer.bindings.length),
    );
  });

  it("replaces transparent, none, and parenthesized keypress bindings from source ranges", () => {
    const source = `/
{
    keymap {
        compatible = "zmk,keymap";

        default_layer {
            bindings = <
&trans  &none  &kp LS(INT_YEN)
            >;
        };
    };
};
`;
    const parsed = parseKeymap(source);
    const [transparent, none, yen] = parsed.layers[0].bindingEntries;
    const updated = replaceBindings(source, [
      { range: transparent.sourceRange, nextRaw: "&kp A" },
      { range: none.sourceRange, nextRaw: "&trans" },
      { range: yen.sourceRange, nextRaw: "&none" },
    ]);
    const reparsed = parseKeymap(updated);

    assert.deepEqual(reparsed.layers[0].bindings, ["&kp A", "&trans", "&none"]);
    assert.equal(updated.includes("&kp LS(INT_YEN)"), false);
  });

  it("replaces momentary, layer-tap, and mod-tap bindings from source ranges", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const replacements = [
      { range: parsed.layers[0].bindingEntries[36].sourceRange, nextRaw: "&mo 4" },
      { range: parsed.layers[0].bindingEntries[38].sourceRange, nextRaw: "&lt 1 TAB" },
      { range: parsed.layers[0].bindingEntries[22].sourceRange, nextRaw: "&mt LEFT_CONTROL X" },
    ];
    const updated = replaceBindings(source, replacements);
    const reparsed = parseKeymap(updated);

    assert.equal(reparsed.layers[0].bindings[36], "&mo 4");
    assert.equal(reparsed.layers[0].bindings[38], "&lt 1 TAB");
    assert.equal(reparsed.layers[0].bindings[22], "&mt LEFT_CONTROL X");
    assert.deepEqual(
      reparsed.layers.map((layer) => layer.bindings.length),
      parsed.layers.map((layer) => layer.bindings.length),
    );
  });

  it("rejects unsupported or overlapping source-range replacements", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const first = parsed.layers[0].bindingEntries[0].sourceRange;
    const second = parsed.layers[0].bindingEntries[1].sourceRange;

    assert.throws(() => replaceBinding(source, first, "&bt BT_SEL 0"), /not supported/);
    assert.throws(() => replaceBinding(source, first, " &kp A"), /trimmed/);
    assert.throws(() => replaceBinding(source, { start: first.start, end: second.end }, "&kp A"), /one binding/);
    assert.throws(
      () =>
        replaceBindings(source, [
          { range: first, nextRaw: "&kp A" },
          { range: first, nextRaw: "&kp B" },
        ]),
      /overlap/,
    );
  });
});

describe("parseTrackballSettings", () => {
  it("parses automouse-layer and scroll-layers from the canonical keymap", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const ts = parseTrackballSettings(source);
    assert.ok(ts, "trackballSettings should not be null");
    assert.ok(ts.automouseLayer, "automouseLayer should be present");
    assert.equal(ts.automouseLayer.value.trim(), "4");
    assert.ok(ts.scrollLayers, "scrollLayers should be present");
    assert.deepEqual(ts.scrollLayers.values, [5]);
  });

  it("returns source ranges that point inside the angle brackets", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const ts = parseTrackballSettings(source);
    const automouseSlice = source.slice(ts.automouseLayer.sourceRange.start, ts.automouseLayer.sourceRange.end);
    assert.equal(automouseSlice.trim(), "4");
    const scrollSlice = source.slice(ts.scrollLayers.sourceRange.start, ts.scrollLayers.sourceRange.end);
    assert.equal(scrollSlice.trim(), "5");
  });

  it("returns null when &trackball block is absent", () => {
    const source = "/ { keymap { compatible = \"zmk,keymap\"; layer { bindings = <&trans>; }; }; };";
    const ts = parseTrackballSettings(source);
    assert.equal(ts, null);
  });

  it("ignores property names inside line comments", () => {
    const source = `
&trackball {
    // automouse-layer = <99>;
    automouse-layer = <3>;
    scroll-layers = <2>;
};`;
    const ts = parseTrackballSettings(source);
    assert.ok(ts);
    assert.equal(ts.automouseLayer.value.trim(), "3");
  });

  it("ignores property names inside block comments", () => {
    const source = `
&trackball {
    /* scroll-layers = <99>;\n    still a comment */
    automouse-layer = <4>;
    scroll-layers = <5>;
};`;
    const ts = parseTrackballSettings(source);
    assert.ok(ts);
    assert.equal(ts.scrollLayers.values[0], 5);
  });

  it("parses multiple scroll-layers values", () => {
    const source = `
&trackball {
    automouse-layer = <4>;
    scroll-layers = <5 6>;
};`;
    const ts = parseTrackballSettings(source);
    assert.ok(ts);
    assert.deepEqual(ts.scrollLayers.values, [5, 6]);
  });

  it("parseKeymap includes trackballSettings in the result", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    assert.ok(parsed.trackballSettings, "trackballSettings should be in parseKeymap result");
    assert.equal(parsed.trackballSettings.automouseLayer.value.trim(), "4");
  });

  it("sensorBindings are structured objects with incKey and decKey", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const sensorLayers = parsed.layers.filter((layer) => layer.sensorBindings.length > 0);
    assert.ok(sensorLayers.length >= 2, "at least 2 layers should have sensor bindings");
    for (const layer of sensorLayers) {
      const sb = layer.sensorBindings[0];
      assert.equal(typeof sb.raw, "string", "raw must be a string");
      assert.equal(sb.behavior, "&inc_dec_kp");
      assert.ok(sb.incKey, "incKey must be non-empty");
      assert.ok(sb.decKey, "decKey must be non-empty");
      assert.ok(sb.sourceRange?.start != null, "sourceRange.start must be set");
      assert.ok(sb.sourceRange?.end != null, "sourceRange.end must be set");
    }
  });

  it("sensorBindings sourceRange points to the correct text in source", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const defaultLayer = parsed.layers[0];
    const sb = defaultLayer.sensorBindings[0];
    assert.ok(sb, "default_layer should have a sensor binding");
    const text = source.slice(sb.sourceRange.start, sb.sourceRange.end).trim();
    assert.ok(text.startsWith("&inc_dec_kp"), `source range should contain &inc_dec_kp, got: ${text}`);
    assert.equal(text, sb.raw.trim());
  });

  it("sensorBindings with non-inc_dec_kp behavior has null incKey/decKey", () => {
    const source = `
/ {
  keymap {
    default_layer {
      bindings = <&kp A>;
      sensor-bindings = <&other_behavior>;
    };
  };
};`;
    const parsed = parseKeymap(source);
    const sb = parsed.layers[0].sensorBindings[0];
    assert.equal(sb.behavior, "&other_behavior");
    assert.equal(sb.incKey, null);
    assert.equal(sb.decKey, null);
  });
});
