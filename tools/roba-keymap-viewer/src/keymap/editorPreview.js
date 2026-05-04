import { isEditableBindingExpression, parseKeymap, replaceBinding } from "./parseKeymap.js";

export function buildEditorState(source, selectedEntry, draftBinding, layers) {
  if (!selectedEntry?.sourceRange) {
    return {
      canEdit: false,
      changed: false,
      message: "Source range unavailable.",
      diff: "",
      contextDiff: "",
      nextSource: source,
    };
  }

  const canEdit = isPhase2Editable(selectedEntry.raw);
  const draft = draftBinding.trim();
  if (!canEdit) {
    return {
      canEdit: false,
      changed: false,
      message: "This binding is outside the Phase 2 edit set.",
      diff: "",
      contextDiff: "",
      nextSource: source,
    };
  }

  if (draft !== draftBinding) {
    return {
      canEdit,
      changed: false,
      message: "Binding must not start or end with spaces.",
      diff: "",
      contextDiff: "",
      nextSource: source,
    };
  }

  try {
    const nextSource = replaceBinding(source, selectedEntry.sourceRange, draft);
    const reparsed = parseKeymap(nextSource);
    const countsStable = layers.every((layer, index) => (
      layer.bindings.length === reparsed.layers[index]?.bindings.length
    ));
    const changed = draft !== selectedEntry.raw;
    return {
      canEdit,
      changed,
      message: changed
        ? countsStable ? "Preview ready. Binding counts remain stable." : "Preview generated, but binding counts changed."
        : "No change.",
      diff: changed ? buildBindingDiff(selectedEntry.raw, draft) : "",
      contextDiff: changed ? buildContextDiff(source, selectedEntry.sourceRange, draft) : "",
      nextSource,
    };
  } catch (error) {
    return {
      canEdit,
      changed: false,
      message: error.message,
      diff: "",
      contextDiff: "",
      nextSource: source,
    };
  }
}

export function isPhase2Editable(raw) {
  return isEditableBindingExpression(raw);
}

function buildBindingDiff(before, after) {
  return `- ${before}\n+ ${after}`;
}

export function buildContextDiff(source, range, nextRaw, contextLines = 1, maxLineLength = 96) {
  const allLines = getSourceLines(source);
  const beforeLine = getLineAtOffset(allLines, range.start);
  const afterLine = `${beforeLine.text.slice(0, range.start - beforeLine.start)}${nextRaw}${beforeLine.text.slice(range.end - beforeLine.start)}`;
  const focusStart = range.start - beforeLine.start;
  const focusEnd = Math.max(range.end - beforeLine.start, focusStart + nextRaw.length);
  const cropWindow = getCropWindow(beforeLine.text.length, focusStart, focusEnd, maxLineLength);
  const firstLineIndex = Math.max(0, beforeLine.index - contextLines);
  const lastLineIndex = Math.min(allLines.length - 1, beforeLine.index + contextLines);
  const lineNumberWidth = String(lastLineIndex + 1).length;
  const rows = [];

  for (let index = firstLineIndex; index <= lastLineIndex; index += 1) {
    const lineNumber = String(index + 1).padStart(lineNumberWidth, " ");
    if (index === beforeLine.index) {
      rows.push(`-${lineNumber} ${cropLine(beforeLine.text, cropWindow)}`);
      rows.push(`+${lineNumber} ${cropLine(afterLine, cropWindow)}`);
    } else {
      rows.push(` ${lineNumber} ${cropLine(allLines[index].text, cropWindow)}`);
    }
  }

  return rows.join("\n");
}

function getCropWindow(lineLength, focusStart, focusEnd, maxLineLength) {
  if (lineLength <= maxLineLength) return { start: 0, end: lineLength };

  const focusWidth = Math.max(1, focusEnd - focusStart);
  const sideRoom = Math.max(12, Math.floor((maxLineLength - focusWidth) / 2));
  let start = Math.max(0, focusStart - sideRoom);
  let end = Math.min(lineLength, start + maxLineLength);

  if (end < focusEnd) {
    end = Math.min(lineLength, focusEnd + sideRoom);
    start = Math.max(0, end - maxLineLength);
  }

  return { start, end };
}

function cropLine(text, window) {
  const start = Math.min(window.start, text.length);
  const end = Math.min(window.end, text.length);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

function getLineAtOffset(lines, offset) {
  for (const line of lines) {
    if (offset <= line.end || line.index === lines.length - 1) {
      return line;
    }
  }

  return { index: 0, start: 0, end: 0, text: "" };
}

function getSourceLines(source) {
  const lines = [];
  let start = 0;
  let index = 0;

  while (start <= source.length) {
    const newline = source.indexOf("\n", start);
    const rawEnd = newline < 0 ? source.length : newline;
    const textEnd = rawEnd > start && source[rawEnd - 1] === "\r" ? rawEnd - 1 : rawEnd;
    lines.push({
      index,
      start,
      end: textEnd,
      text: source.slice(start, textEnd),
    });
    if (newline < 0) break;
    start = newline + 1;
    index += 1;
  }

  return lines;
}
