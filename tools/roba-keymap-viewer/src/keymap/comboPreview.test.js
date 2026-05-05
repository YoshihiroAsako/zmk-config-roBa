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
});
