import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { buildComboPreviewState } from "./comboPreview.js";
import { parseKeymap } from "./parseKeymap.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

describe("combo preview state", () => {
  it("builds a preview for editable combo binding and positions", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const combo = parsed.combos.find((item) => item.name === "double_quotation");
    const state = buildComboPreviewState(source, combo, {
      bindingRaw: "&kp DQT",
      positionsRaw: "17 18",
    });

    assert.equal(state.canEditBinding, true);
    assert.equal(state.changed, true);
    assert.equal(state.valid, true);
    assert.match(state.message, /Combo preview ready/);
    assert.match(state.contextDiff, /Binding/);
    assert.match(state.contextDiff, /Positions/);
    assert.match(state.contextDiff, /&kp AT_SIGN/);
    assert.match(state.contextDiff, /&kp DQT/);
    assert.match(state.contextDiff, /18 19/);
    assert.match(state.contextDiff, /17 18/);

    const reparsed = parseKeymap(state.nextSource);
    const updated = reparsed.combos.find((item) => item.name === "double_quotation");
    assert.equal(updated.binding, "&kp DQT");
    assert.deepEqual(updated.positions, [17, 18]);
    assert.equal(reparsed.combos.length, parsed.combos.length);
  });

  it("keeps unsupported combo bindings read-only while allowing position previews", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const combo = parsed.combos.find((item) => item.name === "muhennkann");
    const positionsOnly = buildComboPreviewState(source, combo, {
      bindingRaw: combo.binding,
      positionsRaw: "10 11",
    });
    const bindingChange = buildComboPreviewState(source, combo, {
      bindingRaw: "&kp A",
      positionsRaw: combo.positions.join(" "),
    });

    assert.equal(positionsOnly.canEditBinding, false);
    assert.equal(positionsOnly.changed, true);
    assert.equal(parseKeymap(positionsOnly.nextSource).combos.find((item) => item.name === "muhennkann").positions[0], 10);
    assert.equal(bindingChange.changed, false);
    assert.match(bindingChange.message, /outside the Phase 2 edit set/);
    assert.equal(bindingChange.nextSource, source);
  });

  it("validates combo positions before building preview source", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const combo = parsed.combos.find((item) => item.name === "tab");

    assert.match(
      buildComboPreviewState(source, combo, { bindingRaw: combo.binding, positionsRaw: "11 11" }).message,
      /unique/,
    );
    assert.match(
      buildComboPreviewState(source, combo, { bindingRaw: combo.binding, positionsRaw: "11" }).message,
      /at least two/,
    );
    assert.match(
      buildComboPreviewState(source, combo, { bindingRaw: combo.binding, positionsRaw: "11 43" }).message,
      /between 0 and 42/,
    );
  });

  it("inserts a layers property line when the combo has none", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const combo = parsed.combos.find((item) => item.name === "tab");
    const state = buildComboPreviewState(
      source,
      combo,
      {
        bindingRaw: combo.binding,
        positionsRaw: combo.positions.join(" "),
        layersRaw: "0 1",
        timeoutMsRaw: "",
      },
      43,
      7,
    );

    assert.equal(state.changed, true);
    assert.equal(state.valid, true);
    assert.match(state.contextDiff, /Layers \(insert\)/);
    assert.match(state.contextDiff, /\+\s*layers = <0 1>;/);

    const reparsed = parseKeymap(state.nextSource);
    const updated = reparsed.combos.find((item) => item.name === "tab");
    assert.deepEqual(updated.layers, [0, 1]);
    assert.ok(updated.layersRange);
    assert.equal(reparsed.combos.length, parsed.combos.length);
    assert.deepEqual(
      reparsed.layers.map((layer) => layer.bindings.length),
      parsed.layers.map((layer) => layer.bindings.length),
    );
  });

  it("inserts a timeout-ms property line when the combo has none", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const combo = parsed.combos.find((item) => item.name === "tab");
    const state = buildComboPreviewState(
      source,
      combo,
      {
        bindingRaw: combo.binding,
        positionsRaw: combo.positions.join(" "),
        layersRaw: combo.layers.join(" "),
        timeoutMsRaw: "120",
      },
      43,
      7,
    );

    assert.equal(state.changed, true);
    assert.equal(state.valid, true);
    assert.match(state.contextDiff, /timeout-ms \(insert\)/);
    assert.match(state.contextDiff, /\+\s*timeout-ms = <120>;/);

    const reparsed = parseKeymap(state.nextSource);
    const updated = reparsed.combos.find((item) => item.name === "tab");
    assert.equal(updated.timeoutMs, 120);
    assert.ok(updated.timeoutMsRange);
  });

  it("replaces existing layers and timeout-ms values in place", () => {
    const source = `/
{
    combos {
        compatible = "zmk,combos";
        sample {
            timeout-ms = <80>;
            key-positions = <0 1>;
            bindings = <&kp A>;
            layers = <0>;
        };
    };
    keymap {
        compatible = "zmk,keymap";
        default_layer { bindings = <&kp A &kp B>; };
        second_layer { bindings = <&trans &trans>; };
    };
};
`;
    const parsed = parseKeymap(source);
    const combo = parsed.combos[0];
    const state = buildComboPreviewState(
      source,
      combo,
      {
        bindingRaw: combo.binding,
        positionsRaw: combo.positions.join(" "),
        layersRaw: "1",
        timeoutMsRaw: "150",
      },
      2,
      2,
    );

    assert.equal(state.valid, true);
    assert.match(state.contextDiff, /Layers/);
    assert.match(state.contextDiff, /timeout-ms/);

    const reparsed = parseKeymap(state.nextSource);
    const updated = reparsed.combos[0];
    assert.deepEqual(updated.layers, [1]);
    assert.equal(updated.timeoutMs, 150);
    assert.equal(reparsed.combos.length, 1);
  });

  it("removes existing layers and timeout-ms property lines when the draft is empty", () => {
    const source = `/
{
    combos {
        compatible = "zmk,combos";
        sample {
            timeout-ms = <80>;
            key-positions = <0 1>;
            bindings = <&kp A>;
            layers = <0>;
        };
    };
    keymap {
        compatible = "zmk,keymap";
        default_layer { bindings = <&kp A &kp B>; };
    };
};
`;
    const parsed = parseKeymap(source);
    const combo = parsed.combos[0];
    const state = buildComboPreviewState(
      source,
      combo,
      {
        bindingRaw: combo.binding,
        positionsRaw: combo.positions.join(" "),
        layersRaw: "",
        timeoutMsRaw: "",
      },
      2,
      1,
    );

    assert.equal(state.valid, true);
    assert.match(state.contextDiff, /Layers \(remove\)/);
    assert.match(state.contextDiff, /timeout-ms \(remove\)/);

    const reparsed = parseKeymap(state.nextSource);
    const updated = reparsed.combos[0];
    assert.equal(updated.layersRange, undefined);
    assert.equal(updated.timeoutMsRange, undefined);
    assert.equal(updated.timeoutMs, 50);
    assert.equal(state.nextSource.includes("layers ="), false);
    assert.equal(state.nextSource.includes("timeout-ms ="), false);
  });

  it("rejects layers and timeout-ms drafts that fail validation", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const combo = parsed.combos.find((item) => item.name === "tab");

    assert.match(
      buildComboPreviewState(
        source,
        combo,
        { bindingRaw: combo.binding, positionsRaw: combo.positions.join(" "), layersRaw: "0 7", timeoutMsRaw: "" },
        43,
        7,
      ).message,
      /between 0 and 6/,
    );
    assert.match(
      buildComboPreviewState(
        source,
        combo,
        { bindingRaw: combo.binding, positionsRaw: combo.positions.join(" "), layersRaw: "0 0", timeoutMsRaw: "" },
        43,
        7,
      ).message,
      /unique/,
    );
    assert.match(
      buildComboPreviewState(
        source,
        combo,
        { bindingRaw: combo.binding, positionsRaw: combo.positions.join(" "), layersRaw: "", timeoutMsRaw: "0" },
        43,
        7,
      ).message,
      /between 1 and 10000/,
    );
    assert.match(
      buildComboPreviewState(
        source,
        combo,
        { bindingRaw: combo.binding, positionsRaw: combo.positions.join(" "), layersRaw: "", timeoutMsRaw: "abc" },
        43,
        7,
      ).message,
      /non-negative integer/,
    );
  });
});
