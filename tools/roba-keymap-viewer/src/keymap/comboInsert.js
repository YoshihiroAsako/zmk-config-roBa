import { buildLineInsertionDiff } from "./comboPreview.js";
import { isEditableBindingExpression, parseKeymap } from "./parseKeymap.js";

export function createEmptyComboDraft(existingCombos = []) {
  return {
    nameRaw: nextComboName(existingCombos),
    bindingRaw: "&kp A",
    positionsRaw: "",
    layersRaw: "",
    timeoutMsRaw: "50",
  };
}

export function buildNewComboPreviewState(source, draft, existingCombos = [], keyCount = 43, layerCount = 7) {
  try {
    const change = buildNewComboDraftChange({ source, draft, existingCombos, keyCount, layerCount });
    const nextSource = `${source.slice(0, change.range.start)}${change.nextRaw}${source.slice(change.range.end)}`;
    const beforeParsed = parseKeymap(source);
    const afterParsed = parseKeymap(nextSource);
    const inserted = afterParsed.combos.find((combo) => combo.name === change.comboName);
    const layerBindingCountsStable = beforeParsed.layers.length === afterParsed.layers.length &&
      beforeParsed.layers.every((layer, index) => layer.bindings.length === afterParsed.layers[index]?.bindings.length);
    const valid = Boolean(inserted) &&
      afterParsed.combos.length === beforeParsed.combos.length + 1 &&
      layerBindingCountsStable;

    return {
      changed: true,
      valid,
      message: valid
        ? "New combo preview ready. Combo count will increase by 1."
        : "Preview generated, but combo or layer diagnostics changed.",
      contextDiff: buildNewComboContextDiff(source, change),
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

export function buildNewComboDraftChange({ source, draft, existingCombos = [], keyCount = 43, layerCount = 7 }) {
  const name = validateComboName(draft.nameRaw, existingCombos);
  const binding = validateBinding(draft.bindingRaw);
  const positions = validatePositions(draft.positionsRaw, keyCount);
  const layers = validateLayers(draft.layersRaw, layerCount);
  const timeoutMs = validateTimeoutMs(draft.timeoutMsRaw);
  const insertion = buildComboNodeInsertion(source, { name, binding, positions, layers, timeoutMs });

  return {
    id: `combo-${name}-node-insert`,
    kind: "combo-node-insert",
    label: `${name} new combo`,
    comboName: name,
    range: insertion.range,
    currentRaw: "",
    nextRaw: insertion.text,
  };
}

export function findCombosInsertionPoint(source) {
  const block = findBlock(source, "combos");
  if (!block) {
    throw new Error("combos block was not found.");
  }
  return lineStart(source, block.end);
}

function buildComboNodeInsertion(source, combo) {
  const insertionPoint = findCombosInsertionPoint(source);
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const indent = inferComboNodeIndent(source, insertionPoint) || "        ";
  const propertyIndent = `${indent}    `;
  const lines = [
    `${indent}${combo.name} {`,
    `${propertyIndent}bindings = <${combo.binding}>;`,
    `${propertyIndent}key-positions = <${combo.positions}>;`,
  ];
  if (combo.layers) lines.push(`${propertyIndent}layers = <${combo.layers}>;`);
  if (combo.timeoutMs) lines.push(`${propertyIndent}timeout-ms = <${combo.timeoutMs}>;`);
  lines.push(`${indent}};`);

  return {
    range: { start: insertionPoint, end: insertionPoint },
    text: `${lines.join(newline)}${newline}`,
  };
}

function buildNewComboContextDiff(source, change) {
  return [
    `# ${change.label}`,
    buildLineInsertionDiff(source, change.range.start, change.nextRaw),
    "",
    "Full node preview",
    stripTrailingNewline(change.nextRaw),
  ].join("\n");
}

function validateComboName(raw, existingCombos) {
  const name = String(raw || "").trim();
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(name)) {
    throw new Error("Combo name must start with a letter or underscore and contain only letters, digits, underscore, or hyphen.");
  }
  if (existingCombos.some((combo) => combo.name === name)) {
    throw new Error("Combo name already exists.");
  }
  return name;
}

function validateBinding(raw) {
  const binding = String(raw || "").trim();
  if (binding !== raw || !isEditableBindingExpression(binding)) {
    throw new Error("Combo binding must be a supported trimmed binding expression.");
  }
  return binding;
}

function validatePositions(raw, keyCount) {
  const text = normalizeSpace(raw);
  if (!text) throw new Error("Combo positions must include at least two keys.");
  if (text !== String(raw || "").trim()) throw new Error("Combo positions must be a single-space-separated list.");
  const positions = text.split(" ").map((value) => {
    if (!/^\d+$/.test(value)) throw new Error("Combo positions must be integer key positions.");
    return Number(value);
  });
  if (positions.length < 2) throw new Error("Combo positions must include at least two keys.");
  if (new Set(positions).size !== positions.length) throw new Error("Combo positions must be unique.");
  if (positions.some((position) => position < 0 || position >= keyCount)) {
    throw new Error(`Combo positions must be between 0 and ${keyCount - 1}.`);
  }
  return text;
}

function validateLayers(raw, layerCount) {
  const text = normalizeSpace(raw);
  if (!text) return "";
  if (text !== String(raw || "").trim()) throw new Error("Combo layers must be a single-space-separated list.");
  const layers = text.split(" ").map((value) => {
    if (!/^\d+$/.test(value)) throw new Error("Combo layers must be integer layer indices.");
    return Number(value);
  });
  if (new Set(layers).size !== layers.length) throw new Error("Combo layers must be unique.");
  if (layers.some((layer) => layer < 0 || layer >= layerCount)) {
    throw new Error(`Combo layers must be between 0 and ${layerCount - 1}.`);
  }
  return text;
}

function validateTimeoutMs(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  if (!/^\d+$/.test(text)) throw new Error("Combo timeout-ms must be a non-negative integer.");
  const value = Number(text);
  if (value < 1 || value > 10000) throw new Error("Combo timeout-ms must be between 1 and 10000.");
  return text;
}

function nextComboName(existingCombos) {
  const used = new Set(existingCombos.map((combo) => combo.name));
  let index = existingCombos.length + 1;
  while (used.has(`combo_${index}`)) index += 1;
  return `combo_${index}`;
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

function inferComboNodeIndent(source, insertionPoint) {
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
