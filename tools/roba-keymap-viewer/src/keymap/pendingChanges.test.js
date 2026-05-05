import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildDraftChange,
  buildPendingChangesState,
  removeDraftChange,
  upsertDraftChange,
} from "./pendingChanges.js";
import { parseKeymap } from "./parseKeymap.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

describe("pending keymap changes", () => {
  it("upserts draft changes by layer and position", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const entry = parsed.layers[0].bindingEntries[0];
    const first = buildDraftChange({
      layerIndex: 0,
      layerName: parsed.layers[0].name,
      position: 0,
      entry,
      nextRaw: "&kp B",
    });
    const second = { ...first, nextRaw: "&kp C" };

    const changes = upsertDraftChange(upsertDraftChange([], first), second);

    assert.equal(changes.length, 1);
    assert.equal(changes[0].id, "layer-0-pos-0");
    assert.equal(changes[0].currentRaw, "&kp Q");
    assert.equal(changes[0].nextRaw, "&kp C");
  });

  it("removes unchanged and explicitly removed drafts", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const entry = parsed.layers[0].bindingEntries[0];
    const change = buildDraftChange({
      layerIndex: 0,
      layerName: parsed.layers[0].name,
      position: 0,
      entry,
      nextRaw: "&kp B",
    });
    const changes = upsertDraftChange([], change);
    const unchanged = upsertDraftChange(changes, { ...change, nextRaw: entry.raw });

    assert.equal(unchanged.length, 0);
    assert.equal(removeDraftChange(changes, change.id).length, 0);
  });

  it("builds a combined preview without shifting later ranges", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const changes = [
      buildDraftChange({
        layerIndex: 0,
        layerName: parsed.layers[0].name,
        position: 0,
        entry: parsed.layers[0].bindingEntries[0],
        nextRaw: "&kp B",
      }),
      buildDraftChange({
        layerIndex: 0,
        layerName: parsed.layers[0].name,
        position: 38,
        entry: parsed.layers[0].bindingEntries[38],
        nextRaw: "&lt 1 TAB",
      }),
    ];

    const state = buildPendingChangesState(source, changes, parsed.layers);
    const nextParsed = parseKeymap(state.nextSource);

    assert.equal(state.valid, true);
    assert.match(state.message, /2 pending changes ready/);
    assert.match(state.contextDiff, /POS0/);
    assert.match(state.contextDiff, /POS38/);
    assert.equal(nextParsed.layers[0].bindings[0], "&kp B");
    assert.equal(nextParsed.layers[0].bindings[38], "&lt 1 TAB");
    assert.equal(nextParsed.layers[0].bindings.length, parsed.layers[0].bindings.length);
  });

  it("rejects stale currentRaw before previewing", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const change = buildDraftChange({
      layerIndex: 0,
      layerName: parsed.layers[0].name,
      position: 0,
      entry: parsed.layers[0].bindingEntries[0],
      nextRaw: "&kp B",
    });
    const state = buildPendingChangesState(source, [{ ...change, currentRaw: "&kp Z" }], parsed.layers);

    assert.equal(state.valid, false);
    assert.match(state.message, /changed on disk/);
    assert.equal(state.nextSource, source);
  });
});
