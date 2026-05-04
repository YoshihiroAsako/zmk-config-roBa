import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { buildEditorState, isPhase2Editable } from "./editorPreview.js";
import { parseKeymap } from "./parseKeymap.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

describe("editor preview state", () => {
  it("enables the Phase 2 preview binding set", () => {
    assert.equal(isPhase2Editable("&kp A"), true);
    assert.equal(isPhase2Editable("&kp LS(INT_YEN)"), true);
    assert.equal(isPhase2Editable("&trans"), true);
    assert.equal(isPhase2Editable("&none"), true);
    assert.equal(isPhase2Editable("&mo 1"), true);
    assert.equal(isPhase2Editable("&lt 2 SPACE"), true);
    assert.equal(isPhase2Editable("&mt LEFT_SHIFT Z"), true);
    assert.equal(isPhase2Editable("&bt BT_SEL 0"), false);
  });

  it("builds a one-binding diff and keymap preview for editable entries", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const selectedEntry = parsed.layers[0].bindingEntries[0];
    const state = buildEditorState(source, selectedEntry, "&kp B", parsed.layers);

    assert.equal(state.canEdit, true);
    assert.equal(state.changed, true);
    assert.equal(state.diff, "- &kp Q\n+ &kp B");
    assert.match(state.message, /Preview ready/);
    assert.equal(
      state.nextSource,
      `${source.slice(0, selectedEntry.sourceRange.start)}&kp B${source.slice(selectedEntry.sourceRange.end)}`,
    );
    assert.equal(parseKeymap(state.nextSource).layers[0].bindings[0], "&kp B");
  });

  it("reports no change for an unchanged editable binding", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const selectedEntry = parsed.layers[0].bindingEntries[0];
    const state = buildEditorState(source, selectedEntry, selectedEntry.raw, parsed.layers);

    assert.equal(state.canEdit, true);
    assert.equal(state.changed, false);
    assert.equal(state.diff, "");
    assert.equal(state.message, "No change.");
    assert.equal(state.nextSource, source);
  });

  it("builds previews for momentary, layer-tap, and mod-tap entries", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const momentary = buildEditorState(source, parsed.layers[0].bindingEntries[36], "&mo 4", parsed.layers);
    const layerTap = buildEditorState(source, parsed.layers[0].bindingEntries[38], "&lt 1 TAB", parsed.layers);
    const modTap = buildEditorState(source, parsed.layers[0].bindingEntries[22], "&mt LEFT_CONTROL X", parsed.layers);

    assert.equal(momentary.canEdit, true);
    assert.equal(momentary.diff, "- &mo 5\n+ &mo 4");
    assert.equal(parseKeymap(momentary.nextSource).layers[0].bindings[36], "&mo 4");
    assert.equal(layerTap.canEdit, true);
    assert.equal(layerTap.diff, "- &lt 2 SPACE\n+ &lt 1 TAB");
    assert.equal(parseKeymap(layerTap.nextSource).layers[0].bindings[38], "&lt 1 TAB");
    assert.equal(modTap.canEdit, true);
    assert.equal(modTap.diff, "- &mt LEFT_SHIFT Z\n+ &mt LEFT_CONTROL X");
    assert.equal(parseKeymap(modTap.nextSource).layers[0].bindings[22], "&mt LEFT_CONTROL X");
  });

  it("keeps unsupported bindings read-only and leaves source unchanged", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const selectedEntry = parsed.layers[6].bindingEntries[5];
    const state = buildEditorState(source, selectedEntry, "&kp A", parsed.layers);

    assert.equal(selectedEntry.raw, "&bt BT_SEL 0");
    assert.equal(state.canEdit, false);
    assert.equal(state.changed, false);
    assert.match(state.message, /outside the Phase 2 edit set/);
    assert.equal(state.nextSource, source);
  });

  it("surfaces validation errors before building preview source", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const selectedEntry = parsed.layers[0].bindingEntries[0];
    const spaced = buildEditorState(source, selectedEntry, " &kp A", parsed.layers);
    const unsupported = buildEditorState(source, selectedEntry, "&bt BT_SEL 0", parsed.layers);

    assert.match(spaced.message, /must not start or end with spaces/);
    assert.equal(spaced.nextSource, source);
    assert.match(unsupported.message, /not supported/);
    assert.equal(unsupported.nextSource, source);
  });
});
