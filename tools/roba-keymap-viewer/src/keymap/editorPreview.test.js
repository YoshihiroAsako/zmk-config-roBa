import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { buildContextDiff, buildEditorState, isPhase2Editable } from "./editorPreview.js";
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
    assert.equal(isPhase2Editable("&mkp MB1"), true);
    assert.equal(isPhase2Editable("&mkp MB4"), true);
    assert.equal(isPhase2Editable("&bt BT_SEL 0"), false);
  });

  it("allows editing existing &mkp bindings and replacing &trans with &mkp", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    // MOUSE layer (index 4): &mkp MB1 is at position 18
    const mkpEntry = parsed.layers[4].bindingEntries[18];
    assert.equal(mkpEntry.raw, "&mkp MB1");
    const mkpState = buildEditorState(source, mkpEntry, "&mkp MB4", parsed.layers);
    assert.equal(mkpState.canEdit, true);
    assert.equal(mkpState.changed, true);
    assert.equal(mkpState.diff, "- &mkp MB1\n+ &mkp MB4");
    assert.match(mkpState.message, /Preview ready/);
    // &trans → &mkp: pick any &trans entry in MOUSE layer (position 0)
    const transEntry = parsed.layers[4].bindingEntries[0];
    assert.equal(transEntry.raw, "&trans");
    const replaceState = buildEditorState(source, transEntry, "&mkp MB4", parsed.layers);
    assert.equal(replaceState.canEdit, true);
    assert.equal(replaceState.changed, true);
    assert.equal(replaceState.diff, "- &trans\n+ &mkp MB4");
    assert.match(replaceState.message, /Preview ready/);
  });

  it("builds a one-binding diff and keymap preview for editable entries", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const selectedEntry = parsed.layers[0].bindingEntries[0];
    const state = buildEditorState(source, selectedEntry, "&kp B", parsed.layers);

    assert.equal(state.canEdit, true);
    assert.equal(state.changed, true);
    assert.equal(state.diff, "- &kp Q\n+ &kp B");
    assert.match(state.contextDiff, /-84 &kp Q/);
    assert.match(state.contextDiff, /\+84 &kp B/);
    assert.match(state.contextDiff, /&kp W/);
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
    assert.equal(state.contextDiff, "");
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
    assert.match(momentary.contextDiff, /-87 .*&mo 5/);
    assert.match(momentary.contextDiff, /\+87 .*&mo 4/);
    assert.equal(parseKeymap(momentary.nextSource).layers[0].bindings[36], "&mo 4");
    assert.equal(layerTap.canEdit, true);
    assert.equal(layerTap.diff, "- &lt 2 SPACE\n+ &lt 1 TAB");
    assert.match(layerTap.contextDiff, /-87 .*&lt 2 SPACE/);
    assert.match(layerTap.contextDiff, /\+87 .*&lt 1 TAB/);
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

  it("builds source context diff around a selected binding range", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const range = parsed.layers[0].bindingEntries[38].sourceRange;
    const diff = buildContextDiff(source, range, "&lt 1 TAB");

    assert.match(diff, /^ 86 /m);
    assert.match(diff, /^-87 .*&lt 2 SPACE/m);
    assert.match(diff, /^\+87 .*&lt 1 TAB/m);
    assert.match(diff, /^ 88 /m);
    assert.equal(diff.split("\n").every((line) => line.length <= 108), true);
    assert.doesNotMatch(diff, /undefined/);
  });

  it("keeps long line diffs focused on the edited binding", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const range = parsed.layers[0].bindingEntries[38].sourceRange;
    const diff = buildContextDiff(source, range, "&lt 1 TAB", 1, 72);

    assert.match(diff, /&lt 2 SPACE/);
    assert.match(diff, /&lt 1 TAB/);
    assert.match(diff, /\.\.\./);
    assert.equal(diff.split("\n").every((line) => line.length <= 84), true);
  });
});
