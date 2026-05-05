import { buildContextDiff } from "./editorPreview.js";
import { isEditableBindingExpression, parseKeymap, replaceBinding } from "./parseKeymap.js";

export function buildComboPreviewState(source, combo, draft, keyCount = 43, layerCount = 7) {
  if (!combo?.sourceRange) {
    return emptyComboState(source, "Select a combo to preview combo edits.");
  }

  const bindingRaw = draft.bindingRaw ?? combo.binding ?? "";
  const positionsRaw = draft.positionsRaw ?? combo.positions.join(" ");
  const layersRaw = draft.layersRaw ?? combo.layers.join(" ");
  const timeoutMsRaw = draft.timeoutMsRaw ?? (combo.timeoutMsRange ? String(combo.timeoutMs) : "");
  const canEditBinding = Boolean(combo.bindingEntry?.sourceRange && isEditableBindingExpression(combo.bindingEntry.raw));

  const bindingChanged = bindingRaw !== combo.binding;
  const positionsChanged = normalizeSpace(positionsRaw) !== combo.positions.join(" ");
  const layersChanged = normalizeSpace(layersRaw) !== combo.layers.join(" ");
  const timeoutCurrent = combo.timeoutMsRange ? String(combo.timeoutMs) : "";
  const timeoutChanged = timeoutMsRaw.trim() !== timeoutCurrent;

  if (
    bindingRaw !== bindingRaw.trim() ||
    positionsRaw !== positionsRaw.trim() ||
    layersRaw !== layersRaw.trim() ||
    timeoutMsRaw !== timeoutMsRaw.trim()
  ) {
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
        label: "Binding",
        range: combo.bindingEntry.sourceRange,
        after: bindingRaw,
      });
    }

    if (positionsChanged) {
      validateComboPositions(positionsRaw, keyCount);
      validatePositionsRange(source, combo.keyPositionsRange);
      replacements.push({
        kind: "positions",
        label: "Positions",
        range: combo.keyPositionsRange,
        after: normalizeSpace(positionsRaw),
      });
    }

    if (layersChanged) {
      const change = buildLayersChange(source, combo, layersRaw, layerCount);
      if (change) replacements.push(change);
    }

    if (timeoutChanged) {
      const change = buildTimeoutMsChange(source, combo, timeoutMsRaw);
      if (change) replacements.push(change);
    }

    const nextSource = applyReplacements(source, replacements);
    const reparsed = parseKeymap(nextSource);
    const beforeParsed = parseKeymap(source);
    const updatedCombo = reparsed.combos.find((item) => item.name === combo.name);
    const comboStable = reparsed.combos.length === beforeParsed.combos.length && Boolean(updatedCombo);
    const layerBindingCountsStable = beforeParsed.layers.length === reparsed.layers.length &&
      beforeParsed.layers.every((layer, index) => layer.bindings.length === reparsed.layers[index]?.bindings.length);
    const valid = comboStable && layerBindingCountsStable;
    const changed = replacements.length > 0;

    return {
      canEditBinding,
      changed,
      valid,
      message: changed
        ? valid ? "Combo preview ready. Combo and layer counts remain stable." : "Preview generated, but combo or layer diagnostics changed."
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

export function buildLayersChange(source, combo, raw, layerCount) {
  const trimmed = raw.trim();
  const existingRange = combo.layersRange;
  if (!trimmed) {
    if (!existingRange) return null;
    return {
      kind: "layers-remove",
      label: "Layers (remove)",
      range: linePropertyRange(source, existingRange),
      after: "",
    };
  }

  validateLayers(trimmed, layerCount);
  const normalized = normalizeSpace(trimmed);
  if (existingRange) {
    return {
      kind: "layers-replace",
      label: "Layers",
      range: existingRange,
      after: normalized,
    };
  }

  return buildPropertyInsertion(source, combo, "layers-insert", "Layers (insert)", "layers", normalized);
}

export function buildTimeoutMsChange(source, combo, raw) {
  const trimmed = raw.trim();
  const existingRange = combo.timeoutMsRange;
  if (!trimmed) {
    if (!existingRange) return null;
    return {
      kind: "timeout-ms-remove",
      label: "timeout-ms (remove)",
      range: linePropertyRange(source, existingRange),
      after: "",
    };
  }

  validateTimeoutMs(trimmed);
  if (existingRange) {
    return {
      kind: "timeout-ms-replace",
      label: "timeout-ms",
      range: existingRange,
      after: trimmed,
    };
  }

  return buildPropertyInsertion(source, combo, "timeout-ms-insert", "timeout-ms (insert)", "timeout-ms", trimmed);
}

function buildPropertyInsertion(source, combo, kind, label, propertyName, value) {
  if (!combo.bodyRange || !combo.keyPositionsRange) {
    throw new Error(`Cannot insert ${propertyName}: combo body range unavailable.`);
  }

  const closingLineStart = lineStart(source, combo.bodyRange.end);
  const indent = lineIndent(source, combo.keyPositionsRange.start);
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const insertion = `${indent}${propertyName} = <${value}>;${newline}`;
  return {
    kind,
    label,
    range: { start: closingLineStart, end: closingLineStart },
    after: insertion,
  };
}

function linePropertyRange(source, valueRange) {
  const start = lineStart(source, valueRange.start);
  const semicolon = source.indexOf(";", valueRange.end);
  if (semicolon < 0) {
    throw new Error("Combo property line is missing a terminating semicolon.");
  }
  let end = semicolon + 1;
  while (end < source.length && (source[end] === "\r" || source[end] === "\n")) {
    end += 1;
    if (source[end - 1] === "\n") break;
  }
  return { start, end };
}

function lineStart(source, position) {
  const newline = source.lastIndexOf("\n", Math.max(position - 1, 0));
  return newline < 0 ? 0 : newline + 1;
}

function lineIndent(source, position) {
  const start = lineStart(source, position);
  let cursor = start;
  while (cursor < position && (source[cursor] === " " || source[cursor] === "\t")) {
    cursor += 1;
  }
  return source.slice(start, cursor);
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
      const isInsertion = replacement.range.start === replacement.range.end;
      const isRemoval = replacement.after === "" && !isInsertion;
      if (isInsertion) {
        return `${replacement.label}\n${buildLineInsertionDiff(source, replacement.range.start, replacement.after)}`;
      }
      if (isRemoval) {
        return `${replacement.label}\n${buildLineRemovalDiff(source, replacement.range)}`;
      }
      return `${replacement.label}\n${buildContextDiff(source, replacement.range, replacement.after)}`;
    })
    .join("\n\n");
}

function buildLineInsertionDiff(source, position, insertion) {
  const insertedText = stripTrailingNewline(insertion);
  const previousLine = getLineEndingBefore(source, position);
  const nextLine = getLineStartingAt(source, position);
  return [
    previousLine ? ` ${previousLine}` : null,
    `+${insertedText}`,
    nextLine ? ` ${nextLine}` : null,
  ].filter(Boolean).join("\n");
}

function buildLineRemovalDiff(source, range) {
  const removedText = stripTrailingNewline(source.slice(range.start, range.end));
  const previousLine = getLineEndingBefore(source, range.start);
  const nextLine = getLineStartingAt(source, range.end);
  return [
    previousLine ? ` ${previousLine}` : null,
    `-${removedText}`,
    nextLine ? ` ${nextLine}` : null,
  ].filter(Boolean).join("\n");
}

function getLineEndingBefore(source, position) {
  if (position <= 0) return "";
  const previousNewline = source.lastIndexOf("\n", position - 1);
  if (previousNewline < 0) return "";
  const start = source.lastIndexOf("\n", previousNewline - 1) + 1;
  const end = source[previousNewline - 1] === "\r" ? previousNewline - 1 : previousNewline;
  return source.slice(start, end);
}

function getLineStartingAt(source, position) {
  if (position >= source.length) return "";
  const nextNewline = source.indexOf("\n", position);
  const end = nextNewline < 0 ? source.length : nextNewline;
  const text = source.slice(position, end);
  return text.endsWith("\r") ? text.slice(0, -1) : text;
}

function stripTrailingNewline(text) {
  return text.replace(/\r?\n$/, "");
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

function validateLayers(raw, layerCount) {
  if (raw !== normalizeSpace(raw)) {
    throw new Error("Combo layers must be a single-space-separated list.");
  }
  if (/[<>&;\r\n]/.test(raw)) {
    throw new Error("Combo layers contain unsupported characters.");
  }

  const layers = raw.split(" ").map((value) => {
    if (!/^\d+$/.test(value)) throw new Error("Combo layers must be integer layer indices.");
    return Number(value);
  });
  if (new Set(layers).size !== layers.length) throw new Error("Combo layers must be unique.");
  if (layers.some((layer) => layer < 0 || layer >= layerCount)) {
    throw new Error(`Combo layers must be between 0 and ${layerCount - 1}.`);
  }
}

function validateTimeoutMs(raw) {
  if (!/^\d+$/.test(raw)) {
    throw new Error("Combo timeout-ms must be a non-negative integer.");
  }
  const value = Number(raw);
  if (value < 1 || value > 10000) {
    throw new Error("Combo timeout-ms must be between 1 and 10000.");
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
