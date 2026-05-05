import { buildContextDiff } from "./editorPreview.js";
import { buildLineInsertionDiff, buildLineRemovalDiff } from "./comboPreview.js";
import { isEditableBindingExpression, parseKeymap, replaceBinding } from "./parseKeymap.js";

const PROPERTY_LIMITS = {
  "wait-ms": { min: 0, max: 10000 },
  "tap-ms": { min: 0, max: 10000 },
};

export function buildMacroPreviewState(source, macro, draft = {}) {
  const editableIndices = macro?.bindingEntries
    ? macro.bindingEntries
        .map((entry, index) => (isEditableBindingExpression(entry.raw) ? index : -1))
        .filter((index) => index >= 0)
    : [];

  if (!macro?.sourceRange) {
    return emptyMacroState(source, "Select a macro to preview macro edits.", editableIndices);
  }

  const bindingDrafts = draft.bindingDrafts || {};
  const waitCurrent = macro.waitMsRange ? String(macro.waitMs) : "";
  const tapCurrent = macro.tapMsRange ? String(macro.tapMs) : "";
  const waitMsRaw = draft.waitMsRaw ?? waitCurrent;
  const tapMsRaw = draft.tapMsRaw ?? tapCurrent;

  for (const value of [...Object.values(bindingDrafts), waitMsRaw, tapMsRaw]) {
    if (typeof value === "string" && value !== value.trim()) {
      return emptyMacroState(source, "Macro drafts must not start or end with spaces.", editableIndices);
    }
  }

  try {
    const replacements = [];
    const editableSet = new Set(editableIndices);

    for (const [indexStr, nextRawValue] of Object.entries(bindingDrafts)) {
      const index = Number(indexStr);
      const entry = macro.bindingEntries?.[index];
      if (!entry || nextRawValue === entry.raw) continue;
      if (!editableSet.has(index)) {
        throw new Error(`Macro binding ${index} is outside the Phase 2 edit set.`);
      }
      replaceBinding(source, entry.sourceRange, nextRawValue);
      replacements.push({
        kind: "binding",
        label: `Binding ${index}`,
        range: entry.sourceRange,
        after: nextRawValue,
      });
    }

    if (waitMsRaw !== waitCurrent) {
      const change = buildWaitMsChange(source, macro, waitMsRaw);
      if (change) replacements.push(change);
    }

    if (tapMsRaw !== tapCurrent) {
      const change = buildTapMsChange(source, macro, tapMsRaw);
      if (change) replacements.push(change);
    }

    const nextSource = applyReplacements(source, replacements);
    const reparsed = parseKeymap(nextSource);
    const beforeParsed = parseKeymap(source);
    const updatedMacro = reparsed.macros.find((item) => item.name === macro.name);
    const macroStable = reparsed.macros.length === beforeParsed.macros.length && Boolean(updatedMacro);
    const layerStable = beforeParsed.layers.length === reparsed.layers.length &&
      beforeParsed.layers.every((layer, index) => layer.bindings.length === reparsed.layers[index]?.bindings.length);
    const bindingCountStable = updatedMacro
      ? updatedMacro.bindings.length === macro.bindings.length
      : false;
    const valid = macroStable && layerStable && bindingCountStable;
    const changed = replacements.length > 0;

    return {
      editableIndices,
      changed,
      valid,
      message: changed
        ? valid
          ? "Macro preview ready. Macro and layer counts remain stable."
          : "Preview generated, but macro or layer diagnostics changed."
        : "No macro draft change.",
      contextDiff: changed ? buildMacroContextDiff(source, replacements) : "",
      nextSource,
    };
  } catch (error) {
    return {
      editableIndices,
      changed: false,
      valid: false,
      message: error.message,
      contextDiff: "",
      nextSource: source,
    };
  }
}

function emptyMacroState(source, message, editableIndices) {
  return {
    editableIndices,
    changed: false,
    valid: false,
    message,
    contextDiff: "",
    nextSource: source,
  };
}

export function buildWaitMsChange(source, macro, raw) {
  return buildMsPropertyChange(source, macro, raw, "wait-ms", macro.waitMsRange);
}

export function buildTapMsChange(source, macro, raw) {
  return buildMsPropertyChange(source, macro, raw, "tap-ms", macro.tapMsRange);
}

function buildMsPropertyChange(source, macro, raw, propertyName, existingRange) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) {
    if (!existingRange) return null;
    return {
      kind: `${propertyName}-remove`,
      label: `${propertyName} (remove)`,
      range: linePropertyRange(source, existingRange),
      after: "",
    };
  }

  validateMsValue(trimmed, propertyName);
  if (existingRange) {
    return {
      kind: `${propertyName}-replace`,
      label: propertyName,
      range: existingRange,
      after: trimmed,
    };
  }

  return buildPropertyInsertion(source, macro, `${propertyName}-insert`, `${propertyName} (insert)`, propertyName, trimmed);
}

function buildPropertyInsertion(source, macro, kind, label, propertyName, value) {
  if (!macro.bodyRange) {
    throw new Error(`Cannot insert ${propertyName}: macro body range unavailable.`);
  }

  const indentRefRange = macro.bindingsRange || macro.bindingEntries?.[0]?.sourceRange;
  if (!indentRefRange) {
    throw new Error(`Cannot insert ${propertyName}: indent reference unavailable.`);
  }

  const closingLineStart = lineStart(source, macro.bodyRange.end);
  const indent = lineIndent(source, indentRefRange.start);
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
    throw new Error("Macro property line is missing a terminating semicolon.");
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

function buildMacroContextDiff(source, replacements) {
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

function validateMsValue(raw, propertyName) {
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${propertyName} must be a non-negative integer.`);
  }
  const value = Number(raw);
  const limits = PROPERTY_LIMITS[propertyName];
  if (value < limits.min || value > limits.max) {
    throw new Error(`${propertyName} must be between ${limits.min} and ${limits.max}.`);
  }
}
