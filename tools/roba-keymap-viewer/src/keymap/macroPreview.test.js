import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { buildMacroPreviewState } from "./macroPreview.js";
import { parseKeymap } from "./parseKeymap.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

describe("macro preview state", () => {
  it("previews an editable macro binding replacement on the canonical macro", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const macro = parsed.macros.find((item) => item.name === "to_layer_0");
    const state = buildMacroPreviewState(source, macro, {
      bindingDrafts: { 2: "&kp A" },
    });

    assert.deepEqual(state.editableIndices, [2]);
    assert.equal(state.changed, true);
    assert.equal(state.valid, true);
    assert.match(state.message, /Macro preview ready/);
    assert.match(state.contextDiff, /Binding 2/);
    assert.match(state.contextDiff, /&kp A/);

    const reparsed = parseKeymap(state.nextSource);
    const updated = reparsed.macros.find((item) => item.name === "to_layer_0");
    assert.equal(updated.bindings[2], "&kp A");
    assert.equal(reparsed.macros.length, parsed.macros.length);
  });

  it("rejects edits to macro bindings outside the Phase 2 set", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const macro = parsed.macros.find((item) => item.name === "to_layer_0");
    const state = buildMacroPreviewState(source, macro, {
      bindingDrafts: { 0: "&kp A" },
    });

    assert.equal(state.changed, false);
    assert.match(state.message, /outside the Phase 2 edit set/);
    assert.equal(state.nextSource, source);
  });

  it("inserts wait-ms and tap-ms property lines when the macro has none", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const macro = parsed.macros.find((item) => item.name === "to_layer_0");
    const state = buildMacroPreviewState(source, macro, {
      bindingDrafts: {},
      waitMsRaw: "10",
      tapMsRaw: "20",
    });

    assert.equal(state.changed, true);
    assert.equal(state.valid, true);
    assert.match(state.contextDiff, /wait-ms \(insert\)/);
    assert.match(state.contextDiff, /\+\s*wait-ms = <10>;/);
    assert.match(state.contextDiff, /tap-ms \(insert\)/);
    assert.match(state.contextDiff, /\+\s*tap-ms = <20>;/);

    const reparsed = parseKeymap(state.nextSource);
    const updated = reparsed.macros.find((item) => item.name === "to_layer_0");
    assert.equal(updated.waitMs, 10);
    assert.equal(updated.tapMs, 20);
    assert.ok(updated.waitMsRange);
    assert.ok(updated.tapMsRange);
  });

  it("replaces existing wait-ms and tap-ms values in place", () => {
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
    keymap {
        compatible = "zmk,keymap";
        default_layer { bindings = <&kp Q>; };
    };
};
`;
    const parsed = parseKeymap(source);
    const macro = parsed.macros[0];
    const state = buildMacroPreviewState(source, macro, {
      bindingDrafts: {},
      waitMsRaw: "55",
      tapMsRaw: "65",
    });

    assert.equal(state.valid, true);
    assert.match(state.contextDiff, /wait-ms/);
    assert.match(state.contextDiff, /tap-ms/);

    const reparsed = parseKeymap(state.nextSource);
    const updated = reparsed.macros[0];
    assert.equal(updated.waitMs, 55);
    assert.equal(updated.tapMs, 65);
    assert.equal(reparsed.macros.length, 1);
  });

  it("removes existing wait-ms and tap-ms property lines when drafts are empty", () => {
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
    keymap {
        compatible = "zmk,keymap";
        default_layer { bindings = <&kp Q>; };
    };
};
`;
    const parsed = parseKeymap(source);
    const macro = parsed.macros[0];
    const state = buildMacroPreviewState(source, macro, {
      bindingDrafts: {},
      waitMsRaw: "",
      tapMsRaw: "",
    });

    assert.equal(state.valid, true);
    assert.match(state.contextDiff, /wait-ms \(remove\)/);
    assert.match(state.contextDiff, /tap-ms \(remove\)/);

    const reparsed = parseKeymap(state.nextSource);
    const updated = reparsed.macros[0];
    assert.equal(updated.waitMsRange, undefined);
    assert.equal(updated.tapMsRange, undefined);
    assert.equal(state.nextSource.includes("wait-ms ="), false);
    assert.equal(state.nextSource.includes("tap-ms ="), false);
  });

  it("rejects wait-ms and tap-ms drafts that fail validation", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const macro = parsed.macros.find((item) => item.name === "to_layer_0");

    assert.match(
      buildMacroPreviewState(source, macro, { bindingDrafts: {}, waitMsRaw: "abc" }).message,
      /non-negative integer/,
    );
    assert.match(
      buildMacroPreviewState(source, macro, { bindingDrafts: {}, tapMsRaw: "20000" }).message,
      /between 0 and 10000/,
    );
  });
});
