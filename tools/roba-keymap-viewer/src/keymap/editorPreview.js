import { isEditableBindingExpression, parseKeymap, replaceBinding } from "./parseKeymap.js";

export function buildEditorState(source, selectedEntry, draftBinding, layers) {
  if (!selectedEntry?.sourceRange) {
    return {
      canEdit: false,
      changed: false,
      message: "Source range unavailable.",
      diff: "",
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
      nextSource: source,
    };
  }

  if (draft !== draftBinding) {
    return {
      canEdit,
      changed: false,
      message: "Binding must not start or end with spaces.",
      diff: "",
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
      nextSource,
    };
  } catch (error) {
    return {
      canEdit,
      changed: false,
      message: error.message,
      diff: "",
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
