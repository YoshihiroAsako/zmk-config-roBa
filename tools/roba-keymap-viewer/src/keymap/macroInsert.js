import { buildLineInsertionDiff } from "./comboPreview.js";
import { isEditableBindingExpression, parseKeymap } from "./parseKeymap.js";

export function createEmptyMacroDraft(existingMacros = []) {
  return {
    nameRaw: nextMacroName(existingMacros),
    bindingsRaw: "&kp A",
    waitMsRaw: "",
    tapMsRaw: "",
    labelRaw: "",
  };
}

export function buildNewMacroPreviewState(source, draft, existingMacros = []) {
  try {
    const change = buildNewMacroDraftChange({ source, draft, existingMacros });
    const nextSource = `${source.slice(0, change.range.start)}${change.nextRaw}${source.slice(change.range.end)}`;
    const beforeParsed = parseKeymap(source);
    const afterParsed = parseKeymap(nextSource);
    const inserted = afterParsed.macros.find((macro) => macro.name === change.macroName);
    const layerBindingCountsStable = beforeParsed.layers.length === afterParsed.layers.length &&
      beforeParsed.layers.every((layer, index) => layer.bindings.length === afterParsed.layers[index]?.bindings.length);
    const valid = Boolean(inserted) &&
      afterParsed.macros.length === beforeParsed.macros.length + 1 &&
      layerBindingCountsStable;

    return {
      changed: true,
      valid,
      message: valid
        ? "New macro preview ready. Macro count will increase by 1."
        : "Preview generated, but macro or layer diagnostics changed.",
      contextDiff: buildNewMacroContextDiff(source, change),
      nextSource,
      change,
    };
  } catch (error) {
    return {
      changed: false,
      valid: false,
      message: error.message,
      contextDiff: "",
      nextSource: source,
      change: null,
    };
  }
}

export function buildNewMacroDraftChange({ source, draft, existingMacros = [] }) {
  const name = validateMacroName(draft.nameRaw, existingMacros);
  const bindings = validateBindings(draft.bindingsRaw);
  const waitMs = validateMacroMs(draft.waitMsRaw, "wait-ms");
  const tapMs = validateMacroMs(draft.tapMsRaw, "tap-ms");
  const label = validateLabel(draft.labelRaw);
  const insertion = buildMacroNodeInsertion(source, { name, bindings, waitMs, tapMs, label });

  return {
    id: `macro-${name}-node-insert`,
    kind: "macro-node-insert",
    label: `${name} new macro`,
    macroName: name,
    range: insertion.range,
    currentRaw: "",
    nextRaw: insertion.text,
  };
}

export function findMacrosInsertionPoint(source) {
  const block = findBlock(source, "macros");
  if (!block) {
    throw new Error("macros block was not found.");
  }
  return lineStart(source, block.end);
}

function buildMacroNodeInsertion(source, macro) {
  const insertionPoint = findMacrosInsertionPoint(source);
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const indent = inferMacroNodeIndent(source, insertionPoint) || "        ";
  const propertyIndent = `${indent}    `;
  const lines = [
    `${indent}${macro.name}: ${macro.name} {`,
    `${propertyIndent}compatible = "zmk,behavior-macro";`,
    `${propertyIndent}#binding-cells = <0>;`,
    `${propertyIndent}bindings = <${macro.bindings}>;`,
  ];
  if (macro.waitMs) lines.push(`${propertyIndent}wait-ms = <${macro.waitMs}>;`);
  if (macro.tapMs) lines.push(`${propertyIndent}tap-ms = <${macro.tapMs}>;`);
  if (macro.label) lines.push(`${propertyIndent}label = "${macro.label}";`);
  lines.push(`${indent}};`);

  return {
    range: { start: insertionPoint, end: insertionPoint },
    text: `${lines.join(newline)}${newline}`,
  };
}

function buildNewMacroContextDiff(source, change) {
  return [
    `# ${change.label}`,
    buildLineInsertionDiff(source, change.range.start, change.nextRaw),
    "",
    "Full node preview",
    stripTrailingNewline(change.nextRaw),
  ].join("\n");
}

function validateMacroName(raw, existingMacros) {
  const name = String(raw || "").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(name)) {
    throw new Error("Macro name must start with a letter or underscore and contain only letters, digits, underscore, or hyphen.");
  }
  if (existingMacros.some((macro) => macro.name === name)) {
    throw new Error("Macro name already exists.");
  }
  return name;
}

function validateBindings(raw) {
  const text = normalizeSpace(raw);
  if (!text) throw new Error("Macro bindings must include at least one binding.");
  if (text !== String(raw || "").trim()) throw new Error("Macro bindings must be single-space-separated.");
  const tokens = text.split(/(?=&)/).map((item) => item.trim()).filter(Boolean);
  if (!tokens.length) throw new Error("Macro bindings must include at least one binding.");
  for (const token of tokens) {
    if (!isEditableBindingExpression(token)) {
      throw new Error("Macro bindings must contain supported binding expressions.");
    }
  }
  return tokens.join(" ");
}

function validateMacroMs(raw, propertyName) {
  const text = String(raw || "").trim();
  if (!text) return "";
  if (!/^\d+$/.test(text)) throw new Error(`${propertyName} must be a non-negative integer.`);
  const value = Number(text);
  if (value < 0 || value > 10000) throw new Error(`${propertyName} must be between 0 and 10000.`);
  return text;
}

function validateLabel(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  if (/[\\"]/.test(text)) throw new Error("Macro label must not contain backslash or double quote.");
  return text;
}

function nextMacroName(existingMacros) {
  const used = new Set(existingMacros.map((macro) => macro.name));
  let index = existingMacros.length + 1;
  while (used.has(`macro_${index}`)) index += 1;
  return `macro_${index}`;
}

function findBlock(source, name) {
  const match = new RegExp(`(?:^|\\s)${name}\\s*\\{`).exec(source);
  if (!match) return null;
  const open = source.indexOf("{", match.index);
  const close = findMatchingBrace(source, open);
  if (close < 0) return null;
  return { start: open, end: close };
}

function findMatchingBrace(source, openIndex) {
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function inferMacroNodeIndent(source, insertionPoint) {
  const previousLineEnd = source.lastIndexOf("\n", Math.max(0, insertionPoint - 2));
  const previousLineStart = previousLineEnd < 0 ? 0 : source.lastIndexOf("\n", previousLineEnd - 1) + 1;
  const previousLine = source.slice(previousLineStart, previousLineEnd < 0 ? insertionPoint : previousLineEnd);
  return previousLine.match(/^\s*/)?.[0] || "";
}

function lineStart(source, position) {
  const newline = source.lastIndexOf("\n", Math.max(position - 1, 0));
  return newline < 0 ? 0 : newline + 1;
}

function normalizeSpace(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function stripTrailingNewline(text) {
  return text.replace(/\r?\n$/, "");
}
