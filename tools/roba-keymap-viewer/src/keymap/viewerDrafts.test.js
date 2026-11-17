import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildComboDraftChanges, buildDraftChange, buildMacroDraftChanges, buildPendingChangesState } from "./pendingChanges.js";
import { parseKeymap } from "./parseKeymap.js";
import { getKeyboardChanges, rebaseAfterKeySave, rebaseHistoryAfterKeySave } from "./viewerDrafts.js";

const source = readFileSync(new URL("../../../../config/roBa.keymap", import.meta.url), "utf8");
const original = parseKeymap(source);

function keyChange(layerIndex, position, nextRaw) {
  const layer = original.layers[layerIndex];
  return buildDraftChange({
    layerIndex, layerName: layer.name, position, entry: layer.bindingEntries[position], nextRaw,
  });
}

const combo = original.combos[0];
const comboChanges = buildComboDraftChanges({ combo, bindingRaw: combo.binding, positionsRaw: "0 2" });
const macro = original.macros[0];
const macroChanges = buildMacroDraftChanges({ source, macro, waitMsRaw: "123" });
const firstKey = keyChange(0, 0, "&kp LS(LC(A))");
const otherKeys = [keyChange(0, 1, "&kp B"), keyChange(1, 0, "&kp F2")];

describe("保存後の下書きとキーボード図", () => {
  it("単一保存でファイルの長さが変わっても、他レイヤーとコンボ・マクロを適用できる", () => {
    const changes = [firstKey, ...otherKeys, ...comboChanges, ...macroChanges];
    const afterSingle = buildPendingChangesState(source, [firstKey], original.layers).nextSource;
    const remaining = rebaseAfterKeySave(changes, firstKey);
    const rebased = buildPendingChangesState(afterSingle, remaining, parseKeymap(afterSingle).layers);
    assert.equal(rebased.valid, true, rebased.message);
    assert.equal(rebased.nextSource, buildPendingChangesState(source, changes, original.layers).nextSource);
    assert.equal(remaining.length, 4);
    assert.deepEqual(rebaseHistoryAfterKeySave([[], [firstKey], [firstKey, otherKeys[0]]], remaining, firstKey), [
      [], rebaseAfterKeySave([otherKeys[0]], firstKey),
    ]);
  });

  it("編集中のレイヤーとコンボ・マクロの差分を該当キーへ表示する", () => {
    const preview = buildPendingChangesState(source, [firstKey, ...otherKeys, ...comboChanges, ...macroChanges], original.layers);
    assert.equal(preview.valid, true, preview.message);
    const edited = parseKeymap(preview.nextSource);
    const base = getKeyboardChanges(original, edited, 0);
    assert.ok(base.get(0).includes("&kp Q → &kp LS(LC(A))"));
    assert.ok(base.get(2).some((message) => message.includes(combo.name)));
    const macroCombo = edited.combos.find((item) => item.binding.startsWith(`&${macro.name} `));
    assert.ok(macroCombo, "正本にマクロを呼び出すコンボがある");
    assert.ok(base.get(macroCombo.positions[0])?.includes(`コンボ ${macroCombo.name} のマクロ ${macro.name} を変更`));
    assert.ok(getKeyboardChanges(original, edited, 1).get(0)?.some((message) => message.endsWith("→ &kp F2")));
    assert.equal(getKeyboardChanges(original, original, 0).size, 0);
  });
});
