import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { buildNewMacroDraftChange, buildNewMacroPreviewState, createEmptyMacroDraft } from "./macroInsert.js";
import { parseKeymap } from "./parseKeymap.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

describe("macro insertion preview", () => {
  it("builds an insertion preview at the end of the macros block", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const state = buildNewMacroPreviewState(
      source,
      {
        nameRaw: "macro_test",
        bindingsRaw: "&kp A",
        waitMsRaw: "10",
        tapMsRaw: "20",
        labelRaw: "MACRO_TEST",
      },
      parsed.macros,
    );

    assert.equal(state.valid, true);
    assert.match(state.contextDiff, /macro_test/);
    assert.match(state.contextDiff, /compatible = "zmk,behavior-macro";/);
    assert.match(state.contextDiff, /bindings = <&kp A>;/);

    const reparsed = parseKeymap(state.nextSource);
    const inserted = reparsed.macros.find((macro) => macro.name === "macro_test");
    assert.equal(reparsed.macros.length, parsed.macros.length + 1);
    assert.equal(inserted.compatible, "zmk,behavior-macro");
    assert.equal(inserted.bindingCells, 0);
    assert.deepEqual(inserted.bindings, ["&kp A"]);
    assert.equal(inserted.waitMs, 10);
    assert.equal(inserted.tapMs, 20);
    assert.equal(inserted.label, "MACRO_TEST");
    assert.deepEqual(
      reparsed.layers.map((layer) => layer.bindings.length),
      parsed.layers.map((layer) => layer.bindings.length),
    );
  });

  it("creates a unique default draft name", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const draft = createEmptyMacroDraft(parsed.macros);

    assert.match(draft.nameRaw, /^macro_\d+$/);
    assert.equal(parsed.macros.some((macro) => macro.name === draft.nameRaw), false);
  });

  it("rejects duplicate names and unsupported bindings", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);

    assert.throws(
      () => buildNewMacroDraftChange({
        source,
        draft: {
          nameRaw: parsed.macros[0].name,
          bindingsRaw: "&kp A",
          waitMsRaw: "",
          tapMsRaw: "",
          labelRaw: "",
        },
        existingMacros: parsed.macros,
      }),
      /already exists/,
    );

    assert.match(
      buildNewMacroPreviewState(
        source,
        {
          nameRaw: "macro_test",
          bindingsRaw: "&to 0",
          waitMsRaw: "",
          tapMsRaw: "",
          labelRaw: "",
        },
        parsed.macros,
      ).message,
      /supported/,
    );
  });
});
