import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { buildNewComboDraftChange, buildNewComboPreviewState, createEmptyComboDraft } from "./comboInsert.js";
import { parseKeymap } from "./parseKeymap.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

describe("combo insertion preview", () => {
  it("builds an insertion preview at the end of the combos block", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const state = buildNewComboPreviewState(
      source,
      {
        nameRaw: "combo_test",
        bindingRaw: "&kp A",
        positionsRaw: "0 1",
        layersRaw: "0",
        timeoutMsRaw: "80",
      },
      parsed.combos,
      43,
      parsed.layers.length,
    );

    assert.equal(state.valid, true);
    assert.match(state.contextDiff, /combo_test/);
    assert.match(state.contextDiff, /bindings = <&kp A>;/);
    assert.match(state.contextDiff, /key-positions = <0 1>;/);

    const reparsed = parseKeymap(state.nextSource);
    const inserted = reparsed.combos.find((combo) => combo.name === "combo_test");
    assert.equal(reparsed.combos.length, parsed.combos.length + 1);
    assert.equal(inserted.binding, "&kp A");
    assert.deepEqual(inserted.positions, [0, 1]);
    assert.deepEqual(inserted.layers, [0]);
    assert.equal(inserted.timeoutMs, 80);
    assert.deepEqual(
      reparsed.layers.map((layer) => layer.bindings.length),
      parsed.layers.map((layer) => layer.bindings.length),
    );
  });

  it("creates a unique default draft name", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const draft = createEmptyComboDraft(parsed.combos);

    assert.match(draft.nameRaw, /^combo_\d+$/);
    assert.equal(parsed.combos.some((combo) => combo.name === draft.nameRaw), false);
  });

  it("rejects duplicate names and invalid positions", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);

    assert.throws(
      () => buildNewComboDraftChange({
        source,
        draft: {
          nameRaw: parsed.combos[0].name,
          bindingRaw: "&kp A",
          positionsRaw: "0 1",
          layersRaw: "",
          timeoutMsRaw: "",
        },
        existingCombos: parsed.combos,
      }),
      /already exists/,
    );

    assert.match(
      buildNewComboPreviewState(
        source,
        {
          nameRaw: "combo_test",
          bindingRaw: "&kp A",
          positionsRaw: "0 0",
          layersRaw: "",
          timeoutMsRaw: "",
        },
        parsed.combos,
      ).message,
      /unique/,
    );
  });
});
