import { isEditableBindingExpression, parseKeymap, replaceBindings } from "./parseKeymap.js";
import { buildContextDiff } from "./editorPreview.js";
import { buildLayersChange, buildTimeoutMsChange } from "./comboPreview.js";

export function getDraftId(layerIndex, position) {
  return `layer-${layerIndex}-pos-${position}`;
}

export function buildDraftChange({ layerIndex, layerName, position, entry, nextRaw }) {
  return {
    id: getDraftId(layerIndex, position),
    kind: "binding",
    label: `${layerName} POS${position}`,
    layerIndex,
    layerName,
    position,
    range: entry.sourceRange,
    currentRaw: entry.raw,
    nextRaw,
  };
}

export function buildComboDraftChanges({ source = null, combo, bindingRaw, positionsRaw, layersRaw, timeoutMsRaw, layerCount = 7 }) {
  const changes = [];
  const normalizedPositions = normalizeSpace(positionsRaw);
  if (bindingRaw !== combo.binding) {
    changes.push({
      id: `combo-${combo.name}-binding`,
      kind: "combo-binding",
      label: `${combo.name} binding`,
      comboName: combo.name,
      range: combo.bindingEntry?.sourceRange,
      currentRaw: combo.binding,
      nextRaw: bindingRaw,
    });
  }
  if (normalizedPositions !== combo.positions.join(" ")) {
    changes.push({
      id: `combo-${combo.name}-positions`,
      kind: "combo-positions",
      label: `${combo.name} positions`,
      comboName: combo.name,
      range: combo.keyPositionsRange,
      currentRaw: combo.positions.join(" "),
      nextRaw: normalizedPositions,
    });
  }
  if (source != null && layersRaw !== undefined) {
    const layersCurrent = combo.layers.join(" ");
    if (normalizeSpace(layersRaw) !== layersCurrent) {
      const layerEdit = buildLayersChange(source, combo, layersRaw, layerCount);
      if (layerEdit) {
        changes.push({
          id: `combo-${combo.name}-layers`,
          kind: layerEdit.kind,
          label: `${combo.name} layers`,
          comboName: combo.name,
          range: layerEdit.range,
          currentRaw: source.slice(layerEdit.range.start, layerEdit.range.end).trim(),
          nextRaw: layerEdit.after,
        });
      }
    }
  }
  if (source != null && timeoutMsRaw !== undefined) {
    const timeoutCurrent = combo.timeoutMsRange ? String(combo.timeoutMs) : "";
    if ((timeoutMsRaw ?? "").trim() !== timeoutCurrent) {
      const timeoutEdit = buildTimeoutMsChange(source, combo, timeoutMsRaw ?? "");
      if (timeoutEdit) {
        changes.push({
          id: `combo-${combo.name}-timeout-ms`,
          kind: timeoutEdit.kind,
          label: `${combo.name} timeout-ms`,
          comboName: combo.name,
          range: timeoutEdit.range,
          currentRaw: source.slice(timeoutEdit.range.start, timeoutEdit.range.end).trim(),
          nextRaw: timeoutEdit.after,
        });
      }
    }
  }
  return changes;
}

export function upsertDraftChange(changes, change) {
  const nextRaw = change.kind?.endsWith("-insert") ? change.nextRaw : change.nextRaw.trim();
  const normalized = { ...change, nextRaw };
  const withoutExisting = changes.filter((item) => item.id !== normalized.id);
  if (nextRaw === normalized.currentRaw) return withoutExisting;
  return [...withoutExisting, normalized].sort(sortDraftChanges);
}

export function upsertDraftChanges(changes, nextChanges) {
  return nextChanges.reduce((current, change) => upsertDraftChange(current, change), changes);
}

export function removeDraftChange(changes, id) {
  return changes.filter((item) => item.id !== id);
}

export function buildPendingChangesState(source, changes, layers) {
  if (changes.length === 0) {
    return {
      valid: false,
      message: "No pending changes.",
      contextDiff: "",
      nextSource: source,
      items: [],
    };
  }

  try {
    for (const change of changes) {
      const currentRaw = source.slice(change.range?.start, change.range?.end).trim();
      if (currentRaw !== change.currentRaw) {
        throw new Error(`${change.label || change.id} changed on disk. Reload source.`);
      }
      validatePendingChange(change);
    }

    const nextSource = applyPendingChanges(source, changes);
    const reparsed = parseKeymap(nextSource);
    const countsStable = layers.length === reparsed.layers.length &&
      layers.every((layer, index) => layer.bindings.length === reparsed.layers[index]?.bindings.length);

    return {
      valid: countsStable,
      message: countsStable
        ? `${changes.length} pending change${changes.length === 1 ? "" : "s"} ready.`
        : "Pending preview generated, but binding counts changed.",
      contextDiff: changes.map((change) => buildChangeContextDiff(source, change)).join("\n\n"),
      nextSource,
      items: changes.map((change) => ({
        ...change,
        contextDiff: buildChangeContextDiff(source, change),
      })),
    };
  } catch (error) {
    return {
      valid: false,
      message: error.message,
      contextDiff: "",
      nextSource: source,
      items: changes.map((change) => ({ ...change, contextDiff: "" })),
    };
  }
}

function buildChangeContextDiff(source, change) {
  return [
    `# ${change.label || `${change.layerName || `Layer ${change.layerIndex}`} POS${change.position}`}`,
    buildContextDiff(source, change.range, change.nextRaw),
  ].join("\n");
}

function applyPendingChanges(source, changes) {
  const bindingChanges = changes.filter((change) => change.kind === "binding" || !change.kind);
  if (bindingChanges.length) {
    replaceBindings(source, bindingChanges.map((change) => ({ range: change.range, nextRaw: change.nextRaw })));
  }

  const ordered = [...changes].sort((a, b) => b.range.start - a.range.start);
  for (let index = 0; index < ordered.length; index += 1) {
    const next = ordered[index + 1];
    if (next && next.range.end > ordered[index].range.start) {
      throw new Error("Replacement ranges must not overlap.");
    }
  }

  return ordered
    .sort((a, b) => b.range.start - a.range.start)
    .reduce((updated, change) => (
      `${updated.slice(0, change.range.start)}${change.nextRaw}${updated.slice(change.range.end)}`
    ), source);
}

function validatePendingChange(change) {
  if (change.kind === "combo-binding") {
    if (!isEditableBindingExpression(change.currentRaw)) {
      throw new Error(`${change.label} is outside the Phase 2 edit set.`);
    }
    if (!isEditableBindingExpression(change.nextRaw)) {
      throw new Error(`${change.label} replacement is not supported in Phase 2.`);
    }
  } else if (change.kind === "combo-positions") {
    validateComboPositions(change.nextRaw);
  } else if (change.kind === "layers-replace") {
    validateLayerValues(change.nextRaw);
  } else if (change.kind === "layers-remove") {
    if (change.nextRaw !== "") throw new Error(`${change.label}: layers-remove must have empty nextRaw.`);
  } else if (change.kind === "layers-insert") {
    validateLayerInsertionContent(change.nextRaw);
  } else if (change.kind === "timeout-ms-replace") {
    validateTimeoutMsValue(change.nextRaw);
  } else if (change.kind === "timeout-ms-remove") {
    if (change.nextRaw !== "") throw new Error(`${change.label}: timeout-ms-remove must have empty nextRaw.`);
  } else if (change.kind === "timeout-ms-insert") {
    validateTimeoutMsInsertionContent(change.nextRaw);
  }
}

function sortDraftChanges(a, b) {
  if (a.kind !== b.kind) return String(a.kind).localeCompare(String(b.kind));
  if (a.layerIndex !== b.layerIndex) return a.layerIndex - b.layerIndex;
  if (a.position !== b.position) return a.position - b.position;
  return a.id.localeCompare(b.id);
}

function validateComboPositions(raw, keyCount = 43) {
  if (!raw || raw !== normalizeSpace(raw)) {
    throw new Error("Combo positions must be a single-space-separated list.");
  }
  const positions = raw.split(" ").map((value) => {
    if (!/^\d+$/.test(value)) throw new Error("Combo positions must be integer key positions.");
    return Number(value);
  });
  if (positions.length < 2) throw new Error("Combo positions must include at least two keys.");
  if (new Set(positions).size !== positions.length) throw new Error("Combo positions must be unique.");
  if (positions.some((position) => position < 0 || position >= keyCount)) {
    throw new Error(`Combo positions must be between 0 and ${keyCount - 1}.`);
  }
}

function validateLayerValues(raw, layerCount = 7) {
  const text = String(raw || "").trim();
  if (!text) throw new Error("Combo layers must not be empty.");
  if (text !== normalizeSpace(text)) throw new Error("Combo layers must be a single-space-separated list.");
  const layers = text.split(" ").map((value) => {
    if (!/^\d+$/.test(value)) throw new Error("Combo layers must be integer layer indices.");
    return Number(value);
  });
  if (new Set(layers).size !== layers.length) throw new Error("Combo layers must be unique.");
  if (layers.some((layer) => layer < 0 || layer >= layerCount)) {
    throw new Error(`Combo layers must be between 0 and ${layerCount - 1}.`);
  }
}

function validateLayerInsertionContent(nextRaw) {
  const match = nextRaw.match(/layers\s*=\s*<([\d\s]+)>;\r?\n$/);
  if (!match) throw new Error("layers-insert content is invalid.");
  validateLayerValues(match[1].trim());
}

function validateTimeoutMsValue(raw) {
  const text = String(raw || "").trim();
  if (!/^\d+$/.test(text)) throw new Error("Combo timeout-ms must be a non-negative integer.");
  const value = Number(text);
  if (value < 1 || value > 10000) throw new Error("Combo timeout-ms must be between 1 and 10000.");
}

function validateTimeoutMsInsertionContent(nextRaw) {
  const match = nextRaw.match(/timeout-ms\s*=\s*<(\d+)>;\r?\n$/);
  if (!match) throw new Error("timeout-ms-insert content is invalid.");
  validateTimeoutMsValue(match[1]);
}

function normalizeSpace(value) {
  return String(value).trim().replace(/\s+/g, " ");
}
