import { parseKeymap, replaceBindings } from "./parseKeymap.js";
import { buildContextDiff } from "./editorPreview.js";

export function getDraftId(layerIndex, position) {
  return `layer-${layerIndex}-pos-${position}`;
}

export function buildDraftChange({ layerIndex, layerName, position, entry, nextRaw }) {
  return {
    id: getDraftId(layerIndex, position),
    layerIndex,
    layerName,
    position,
    range: entry.sourceRange,
    currentRaw: entry.raw,
    nextRaw,
  };
}

export function upsertDraftChange(changes, change) {
  const nextRaw = change.nextRaw.trim();
  const normalized = { ...change, nextRaw };
  const withoutExisting = changes.filter((item) => item.id !== normalized.id);
  if (nextRaw === normalized.currentRaw) return withoutExisting;
  return [...withoutExisting, normalized].sort(sortDraftChanges);
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
        throw new Error(`Layer ${change.layerIndex} position ${change.position} changed on disk. Reload source.`);
      }
    }

    const replacements = changes.map((change) => ({
      range: change.range,
      nextRaw: change.nextRaw,
    }));
    const nextSource = replaceBindings(source, replacements);
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
    `# ${change.layerName || `Layer ${change.layerIndex}`} POS${change.position}`,
    buildContextDiff(source, change.range, change.nextRaw),
  ].join("\n");
}

function sortDraftChanges(a, b) {
  if (a.layerIndex !== b.layerIndex) return a.layerIndex - b.layerIndex;
  return a.position - b.position;
}
