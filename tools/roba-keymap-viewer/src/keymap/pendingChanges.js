import { isEditableBindingExpression, parseKeymap, replaceBindings } from "./parseKeymap.js";
import { buildContextDiff } from "./editorPreview.js";

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

export function buildComboDraftChanges({ combo, bindingRaw, positionsRaw }) {
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
  return changes;
}

export function upsertDraftChange(changes, change) {
  const nextRaw = change.nextRaw.trim();
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
  }
  if (change.kind === "combo-positions") {
    validateComboPositions(change.nextRaw);
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

function normalizeSpace(value) {
  return String(value).trim().replace(/\s+/g, " ");
}
