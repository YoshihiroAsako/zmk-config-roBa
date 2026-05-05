import { buildContextDiff } from "./editorPreview.js";
import { isEditableBindingExpression, parseKeymap, replaceBinding } from "./parseKeymap.js";

export function buildComboPreviewState(source, combo, draft, keyCount = 43) {
  if (!combo?.sourceRange) {
    return emptyComboState(source, "Select a combo to preview combo edits.");
  }

  const bindingRaw = draft.bindingRaw ?? combo.binding ?? "";
  const positionsRaw = draft.positionsRaw ?? combo.positions.join(" ");
  const canEditBinding = Boolean(combo.bindingEntry?.sourceRange && isEditableBindingExpression(combo.bindingEntry.raw));
  const bindingChanged = bindingRaw !== combo.binding;
  const positionsChanged = normalizeSpace(positionsRaw) !== combo.positions.join(" ");

  if (bindingRaw !== bindingRaw.trim() || positionsRaw !== positionsRaw.trim()) {
    return emptyComboState(source, "Combo drafts must not start or end with spaces.", canEditBinding);
  }

  try {
    const replacements = [];
    if (bindingChanged) {
      if (!canEditBinding) {
        throw new Error("This combo binding is outside the Phase 2 edit set.");
      }
      replaceBinding(source, combo.bindingEntry.sourceRange, bindingRaw);
      replacements.push({
        kind: "binding",
        range: combo.bindingEntry.sourceRange,
        after: bindingRaw,
      });
    }

    if (positionsChanged) {
      validateComboPositions(positionsRaw, keyCount);
      validatePositionsRange(source, combo.keyPositionsRange);
      replacements.push({
        kind: "positions",
        range: combo.keyPositionsRange,
        after: normalizeSpace(positionsRaw),
      });
    }

    const nextSource = applyReplacements(source, replacements);
    const reparsed = parseKeymap(nextSource);
    const comboStable = reparsed.combos.length === parseKeymap(source).combos.length &&
      reparsed.combos.some((item) => item.name === combo.name);
    const changed = replacements.length > 0;

    return {
      canEditBinding,
      changed,
      valid: comboStable,
      message: changed
        ? comboStable ? "Combo preview ready. Combo count remains stable." : "Preview generated, but combo diagnostics changed."
        : "No combo draft change.",
      contextDiff: changed ? buildComboContextDiff(source, replacements) : "",
      nextSource,
    };
  } catch (error) {
    return {
      canEditBinding,
      changed: false,
      valid: false,
      message: error.message,
      contextDiff: "",
      nextSource: source,
    };
  }
}

function emptyComboState(source, message, canEditBinding = false) {
  return {
    canEditBinding,
    changed: false,
    valid: false,
    message,
    contextDiff: "",
    nextSource: source,
  };
}

function applyReplacements(source, replacements) {
  return [...replacements]
    .sort((a, b) => b.range.start - a.range.start)
    .reduce((updated, replacement) => (
      `${updated.slice(0, replacement.range.start)}${replacement.after}${updated.slice(replacement.range.end)}`
    ), source);
}

function buildComboContextDiff(source, replacements) {
  return replacements
    .map((replacement) => {
      const title = replacement.kind === "binding" ? "Binding" : "Positions";
      return `${title}\n${buildContextDiff(source, replacement.range, replacement.after)}`;
    })
    .join("\n\n");
}

function validateComboPositions(raw, keyCount) {
  if (!raw || raw !== normalizeSpace(raw)) {
    throw new Error("Combo positions must be a single-space-separated list.");
  }
  if (/[<>&;\r\n]/.test(raw)) {
    throw new Error("Combo positions contain unsupported characters.");
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

function validatePositionsRange(source, range) {
  if (
    !range ||
    !Number.isInteger(range.start) ||
    !Number.isInteger(range.end) ||
    range.start < 0 ||
    range.end < range.start ||
    range.end > source.length
  ) {
    throw new Error("Combo positions source range is unavailable.");
  }

  if (!/^[\d\s]+$/.test(source.slice(range.start, range.end))) {
    throw new Error("Combo positions source range is invalid.");
  }
}

function normalizeSpace(value) {
  return String(value).trim().replace(/\s+/g, " ");
}
