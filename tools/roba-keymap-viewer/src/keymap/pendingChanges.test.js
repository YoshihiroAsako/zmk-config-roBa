import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildDraftChange,
  buildComboDraftChanges,
  buildPendingChangesState,
  removeDraftChange,
  upsertDraftChange,
  upsertDraftChanges,
} from "./pendingChanges.js";
import { parseKeymap } from "./parseKeymap.js";
import { buildLayersChange, buildTimeoutMsChange } from "./comboPreview.js";

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

  it("builds a combined preview for key bindings and combo drafts", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const combo = parsed.combos.find((item) => item.name === "double_quotation");
    const keyChange = buildDraftChange({
      layerIndex: 0,
      layerName: parsed.layers[0].name,
      position: 0,
      entry: parsed.layers[0].bindingEntries[0],
      nextRaw: "&kp B",
    });
    const comboChanges = buildComboDraftChanges({
      combo,
      bindingRaw: "&kp DQT",
      positionsRaw: "17 18",
    });

    const changes = upsertDraftChanges([keyChange], comboChanges);
    const state = buildPendingChangesState(source, changes, parsed.layers);
    const nextParsed = parseKeymap(state.nextSource);
    const nextCombo = nextParsed.combos.find((item) => item.name === "double_quotation");

    assert.equal(state.valid, true);
    assert.match(state.contextDiff, /default_layer POS0/);
    assert.match(state.contextDiff, /double_quotation binding/);
    assert.match(state.contextDiff, /double_quotation positions/);
    assert.equal(nextParsed.layers[0].bindings[0], "&kp B");
    assert.equal(nextCombo.binding, "&kp DQT");
    assert.deepEqual(nextCombo.positions, [17, 18]);
  });

  it("builds combo draft changes for layers-insert and timeout-ms-insert", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const combo = parsed.combos.find((item) => item.name === "double_quotation");

    const changes = buildComboDraftChanges({
      source,
      combo,
      bindingRaw: combo.binding,
      positionsRaw: combo.positions.join(" "),
      layersRaw: "0",
      timeoutMsRaw: "100",
    });

    const layersChange = changes.find((c) => c.id.endsWith("-layers"));
    const timeoutChange = changes.find((c) => c.id.endsWith("-timeout-ms"));

    assert.equal(changes.length, 2);
    assert.equal(layersChange.kind, "layers-insert");
    assert.equal(layersChange.currentRaw, "");
    assert.match(layersChange.nextRaw, /layers\s*=\s*<0>;\r?\n/);
    assert.equal(timeoutChange.kind, "timeout-ms-insert");
    assert.equal(timeoutChange.currentRaw, "");
    assert.match(timeoutChange.nextRaw, /timeout-ms\s*=\s*<100>;\r?\n/);
  });

  it("preserves insert nextRaw when upserting (does not trim)", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const combo = parsed.combos.find((item) => item.name === "double_quotation");

    const changes = buildComboDraftChanges({
      source,
      combo,
      bindingRaw: combo.binding,
      positionsRaw: combo.positions.join(" "),
      layersRaw: "0",
      timeoutMsRaw: "100",
    });
    const upserted = upsertDraftChanges([], changes);
    const layersChange = upserted.find((c) => c.id.endsWith("-layers"));

    assert.match(layersChange.nextRaw, /\r?\n$/);
  });

  it("applies layers-insert and timeout-ms-insert in pending changes state", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const combo = parsed.combos.find((item) => item.name === "double_quotation");

    const changes = upsertDraftChanges([], buildComboDraftChanges({
      source,
      combo,
      bindingRaw: combo.binding,
      positionsRaw: combo.positions.join(" "),
      layersRaw: "0",
      timeoutMsRaw: "100",
    }));

    const state = buildPendingChangesState(source, changes, parsed.layers);
    const nextParsed = parseKeymap(state.nextSource);
    const nextCombo = nextParsed.combos.find((item) => item.name === "double_quotation");

    assert.equal(state.valid, true);
    assert.deepEqual(nextCombo.layers, [0]);
    assert.equal(nextCombo.timeoutMs, 100);
    assert.notEqual(nextCombo.timeoutMsRange, null);
  });

  it("builds combo draft changes for layers-replace when layers already exist", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const combo = parsed.combos.find((item) => item.name === "double_quotation");

    const layerEdit = buildLayersChange(source, combo, "0", 7);
    const insertedSource = `${source.slice(0, layerEdit.range.start)}${layerEdit.after}${source.slice(layerEdit.range.end)}`;
    const parsedWithLayers = parseKeymap(insertedSource);
    const comboWithLayers = parsedWithLayers.combos.find((item) => item.name === "double_quotation");

    const changes = buildComboDraftChanges({
      source: insertedSource,
      combo: comboWithLayers,
      bindingRaw: comboWithLayers.binding,
      positionsRaw: comboWithLayers.positions.join(" "),
      layersRaw: "1 2",
    });

    const layersChange = changes.find((c) => c.id.endsWith("-layers"));
    assert.equal(layersChange.kind, "layers-replace");
    assert.equal(layersChange.currentRaw, "0");
    assert.equal(layersChange.nextRaw, "1 2");
  });
});
