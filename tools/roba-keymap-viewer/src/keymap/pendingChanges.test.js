import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildDraftChange,
  buildComboDraftChanges,
  buildLayerRenameDraftChange,
  buildTrackballAutomouseDraftChange,
  buildTrackballScrollLayersDraftChange,
  buildPendingChangesState,
  removeDraftChange,
  upsertDraftChange,
  upsertDraftChanges,
} from "./pendingChanges.js";
import { parseKeymap, parseTrackballSettings } from "./parseKeymap.js";
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

  it("shows insertion diff for layers-insert and timeout-ms-insert changes", async () => {
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
    const layersItem = state.items.find((c) => c.id.endsWith("-layers"));
    const timeoutItem = state.items.find((c) => c.id.endsWith("-timeout-ms"));

    assert.match(layersItem.contextDiff, /^\+\s*layers\s*=\s*<0>;/m);
    assert.doesNotMatch(layersItem.contextDiff, /^-.*};/m);
    assert.match(timeoutItem.contextDiff, /^\+\s*timeout-ms\s*=\s*<100>;/m);
    assert.doesNotMatch(timeoutItem.contextDiff, /^-.*};/m);
  });

  it("shows removal diff for layers-remove and timeout-ms-remove changes", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const combo = parsed.combos.find((item) => item.name === "double_quotation");

    const layersEdit = buildLayersChange(source, combo, "0", 7);
    const sourceWithLayers = `${source.slice(0, layersEdit.range.start)}${layersEdit.after}${source.slice(layersEdit.range.end)}`;
    const parsedWithLayers = parseKeymap(sourceWithLayers);
    const comboWithLayers = parsedWithLayers.combos.find((item) => item.name === "double_quotation");

    const changes = upsertDraftChanges([], buildComboDraftChanges({
      source: sourceWithLayers,
      combo: comboWithLayers,
      bindingRaw: comboWithLayers.binding,
      positionsRaw: comboWithLayers.positions.join(" "),
      layersRaw: "",
    }));

    const state = buildPendingChangesState(sourceWithLayers, changes, parsedWithLayers.layers);
    const layersItem = state.items.find((c) => c.id.endsWith("-layers"));

    assert.match(layersItem.contextDiff, /^-\s*layers\s*=\s*<0>;/m);
    assert.doesNotMatch(layersItem.contextDiff, /^\+/m);
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

  it("applies a layer rename through pending changes state", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const target = parsed.layers[1];
    const change = buildLayerRenameDraftChange({
      layerIndex: 1,
      currentName: target.name,
      nextName: "FN",
      nameRange: target.nameRange,
    });

    const state = buildPendingChangesState(source, [change], parsed.layers);
    assert.equal(state.valid, true);
    const reparsed = parseKeymap(state.nextSource);
    assert.equal(reparsed.layers[1].name, "FN");
    assert.deepEqual(
      reparsed.layers.map((layer) => layer.bindings.length),
      parsed.layers.map((layer) => layer.bindings.length),
    );
  });

  it("rejects layer renames that collide with another layer name", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const target = parsed.layers[1];
    const change = buildLayerRenameDraftChange({
      layerIndex: 1,
      currentName: target.name,
      nextName: parsed.layers[2].name,
      nameRange: target.nameRange,
    });

    const state = buildPendingChangesState(source, [change], parsed.layers);
    assert.equal(state.valid, false);
    assert.match(state.message, /unique/);
  });

  it("rejects layer renames with invalid identifier characters", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const target = parsed.layers[1];
    const change = buildLayerRenameDraftChange({
      layerIndex: 1,
      currentName: target.name,
      nextName: "1bad",
      nameRange: target.nameRange,
    });

    const state = buildPendingChangesState(source, [change], parsed.layers);
    assert.equal(state.valid, false);
    assert.match(state.message, /letter or underscore/);
  });

  it("rejects binding with &lt N where N is out of layer range", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const entry = parsed.layers[0].bindingEntries[0];
    const change = buildDraftChange({
      layerIndex: 0,
      layerName: parsed.layers[0].name,
      position: 0,
      entry,
      nextRaw: "&lt 7 TAB",
    });

    const state = buildPendingChangesState(source, [change], parsed.layers);
    assert.equal(state.valid, false);
    assert.match(state.message, /out of range/);
  });

  it("rejects binding with &mo N where N is out of layer range", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const entry = parsed.layers[0].bindingEntries[0];
    const change = buildDraftChange({
      layerIndex: 0,
      layerName: parsed.layers[0].name,
      position: 0,
      entry,
      nextRaw: "&mo 99",
    });

    const state = buildPendingChangesState(source, [change], parsed.layers);
    assert.equal(state.valid, false);
    assert.match(state.message, /out of range/);
  });

  it("accepts binding with layer reference at the highest valid index", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const entry = parsed.layers[0].bindingEntries[0];
    const change = buildDraftChange({
      layerIndex: 0,
      layerName: parsed.layers[0].name,
      position: 0,
      entry,
      nextRaw: `&lt ${parsed.layers.length - 1} TAB`,
    });

    const state = buildPendingChangesState(source, [change], parsed.layers);
    assert.equal(state.valid, true);
  });

  it("rejects combo-binding with layer reference out of range", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const combo = parsed.combos[0];
    assert.ok(combo, "roBa keymap must have at least one combo");
    const change = {
      id: `combo-${combo.name}-binding`,
      kind: "combo-binding",
      label: `${combo.name} binding`,
      comboName: combo.name,
      range: combo.bindingEntry.sourceRange,
      currentRaw: combo.binding,
      nextRaw: `&mo ${parsed.layers.length}`,
    };

    const state = buildPendingChangesState(source, [change], parsed.layers);
    assert.equal(state.valid, false);
    assert.match(state.message, /out of range/);
  });
});

describe("trackball pending changes", () => {
  const makeTrackballSource = (automouse, scroll) => `
&trackball {
    automouse-layer = <${automouse}>;
    scroll-layers = <${scroll}>;
};
/ { keymap { compatible = "zmk,keymap"; default_layer { bindings = <&trans &trans &trans>; }; layer_1 { bindings = <&trans &trans &trans>; }; layer_2 { bindings = <&trans &trans &trans>; }; layer_3 { bindings = <&trans &trans &trans>; }; layer_4 { bindings = <&trans &trans &trans>; }; layer_5 { bindings = <&trans &trans &trans>; }; layer_6 { bindings = <&trans &trans &trans>; }; }; };
`;

  it("buildTrackballAutomouseDraftChange creates a valid change", () => {
    const source = makeTrackballSource(4, 5);
    const ts = parseTrackballSettings(source);
    const change = buildTrackballAutomouseDraftChange({ trackballSettings: ts, nextRaw: "3" });
    assert.ok(change);
    assert.equal(change.kind, "trackball-automouse-layer");
    assert.equal(change.currentRaw, "4");
    assert.equal(change.nextRaw, "3");
  });

  it("buildTrackballScrollLayersDraftChange sorts values ascending", () => {
    const source = makeTrackballSource(4, 5);
    const ts = parseTrackballSettings(source);
    const change = buildTrackballScrollLayersDraftChange({ trackballSettings: ts, nextRaw: "6 5" });
    assert.ok(change);
    assert.equal(change.nextRaw, "5 6");
  });

  it("buildPendingChangesState validates automouse-layer out of range", () => {
    const source = makeTrackballSource(4, 5);
    const parsed = parseKeymap(source);
    const ts = parseTrackballSettings(source);
    const change = buildTrackballAutomouseDraftChange({ trackballSettings: ts, nextRaw: "99" });
    const state = buildPendingChangesState(source, [change], parsed.layers);
    assert.equal(state.valid, false);
    assert.match(state.message, /automouse-layer/);
  });

  it("buildPendingChangesState accepts automouse-layer = 0 (disabled)", () => {
    const source = makeTrackballSource(4, 5);
    const parsed = parseKeymap(source);
    const ts = parseTrackballSettings(source);
    const change = buildTrackballAutomouseDraftChange({ trackballSettings: ts, nextRaw: "0" });
    const state = buildPendingChangesState(source, [change], parsed.layers);
    assert.equal(state.valid, true);
  });

  it("buildPendingChangesState rejects empty scroll-layers", () => {
    const source = makeTrackballSource(4, 5);
    const parsed = parseKeymap(source);
    const ts = parseTrackballSettings(source);
    const change = buildTrackballScrollLayersDraftChange({ trackballSettings: ts, nextRaw: "" });
    assert.ok(change, "change created even with empty nextRaw");
    const state = buildPendingChangesState(source, [change], parsed.layers);
    assert.equal(state.valid, false);
    assert.match(state.message, /scroll-layers/);
  });

  it("buildPendingChangesState rejects duplicate scroll-layers", () => {
    const source = makeTrackballSource(4, 5);
    const parsed = parseKeymap(source);
    const ts = parseTrackballSettings(source);
    const change = buildTrackballScrollLayersDraftChange({ trackballSettings: ts, nextRaw: "5 5" });
    const state = buildPendingChangesState(source, [change], parsed.layers);
    assert.equal(state.valid, false);
    assert.match(state.message, /unique/);
  });

  it("upsertDraftChange removes NoOp trackball change", () => {
    const source = makeTrackballSource(4, 5);
    const ts = parseTrackballSettings(source);
    const change = buildTrackballAutomouseDraftChange({ trackballSettings: ts, nextRaw: "4" });
    const result = upsertDraftChange([], change);
    assert.equal(result.length, 0, "should be removed as NoOp");
  });

  it("buildPendingChangesState generates preview source for automouse-layer change", () => {
    const source = makeTrackballSource(4, 5);
    const parsed = parseKeymap(source);
    const ts = parseTrackballSettings(source);
    const change = buildTrackballAutomouseDraftChange({ trackballSettings: ts, nextRaw: "3" });
    const state = buildPendingChangesState(source, [change], parsed.layers);
    assert.equal(state.valid, true);
    assert.ok(state.nextSource.includes("automouse-layer = <3>"));
  });
});
