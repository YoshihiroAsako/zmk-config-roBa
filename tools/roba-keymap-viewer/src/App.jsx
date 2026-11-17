import { getKeyboardChanges, rebaseAfterKeySave, rebaseHistoryAfterKeySave } from "./keymap/viewerDrafts.js";
import { nextKeyPosition, focusWrapTarget } from "./keyboardNavigation.js";
import initialKeymapSource from "../../../config/roBa.keymap?raw";
import roBaMetadata from "../../../config/roBa.json";
import dtsiSource from "../../../boards/shields/roBa/roBa.dtsi?raw";
import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, searchCatalog } from "./keymap/keycodeCatalog.js";
import { buildMarkdown } from "./export/markdown.js";
import { captureKeyToBinding } from "./keymap/keyCapture.js";
import { describeBinding } from "./keymap/bindingDisplay.js";
import { buildComboPreviewState } from "./keymap/comboPreview.js";
import { buildNewComboPreviewState, createEmptyComboDraft } from "./keymap/comboInsert.js";
import { buildNewMacroPreviewState, createEmptyMacroDraft } from "./keymap/macroInsert.js";
import { buildEditorState } from "./keymap/editorPreview.js";
import {
  BT_COMMANDS,
  HOLD_TAP_MODIFIERS,
  KEY_PRESS_MODIFIERS,
  MOUSE_BUTTONS,
  STRUCTURED_BEHAVIOR_LABELS,
  STRUCTURED_BEHAVIORS,
  buildStructuredBinding,
  parseStructuredBinding,
  validateStructuredBinding,
} from "./keymap/structuredBinding.js";
import { buildMacroPreviewState } from "./keymap/macroPreview.js";
import { countDtsPhysicalKeys, parseKeymap } from "./keymap/parseKeymap.js";
import {
  buildDraftChange,
  buildComboDraftChanges,
  buildNewComboDraftChanges,
  buildNewMacroDraftChanges,
  buildLayerRenameDraftChange,
  buildMacroDraftChanges,
  buildTrackballAutomouseDraftChange,
  buildTrackballScrollLayersDraftChange,
  buildSensorBindingDraftChange,
  buildSensorBindingInsertDraftChange,
  buildSensorBindingRemoveDraftChange,
  buildPendingChangesState,
  getDraftId,
  removeDraftChange,
  upsertDraftChange,
  upsertDraftChanges,
} from "./keymap/pendingChanges.js";

const KEY_SIZE = 44;
const UNIT = 48;
const TRACKBALL = { x: 10, y: 3.8, r: 0.62 };

const TABS = ["Bindings", "Combos", "Macros", "Behaviors", "Sensors", "Settings", "Preview", "Markdown", "Diagnostics"];
const TAB_LABELS = { Bindings: "キー一覧", Combos: "コンボ", Macros: "マクロ", Behaviors: "動作定義", Sensors: "エンコーダー", Settings: "設定", Preview: "変更・保存", Markdown: "Markdown", Diagnostics: "診断" };
const BEHAVIOR_LABELS_JA = { "&kp": "キー入力", "&lt": "長押しでレイヤー", "&mt": "長押しで修飾キー", "&to_layer_0": "レイヤー0へ", "&mkp": "マウスボタン", "&bt": "Bluetooth", "&bootloader": "書き込みモード" };
const EMPTY_SAVE_STATUS = { tone: "idle", title: "", message: "", backupPath: "", drawerMessage: "" };

function editorMessage(message) {
  return ({
    "This binding is outside the Phase 2 edit set.": "この割り当ては編集に対応していません。",
    "Source range unavailable.": "元ファイル内の位置を取得できないため、編集できません。",
    "Binding must not start or end with spaces.": "割り当てコードの前後に空白を入れないでください。",
    "No change.": "変更はありません。",
    "No combo draft change.": "コンボの変更はありません。",
    "No macro draft change.": "マクロの変更はありません。",
    "No pending changes.": "追加済みの変更はありません。",
    "Preview ready. Binding counts remain stable.": "変更内容を確認できます。「変更に追加」で保存対象に加えます。",
  })[message] || message;
}

function useFormDraft(baseline) {
  const [input, setInput] = useState(null);
  const change = (value) => setInput((previous) => {
    const next = typeof value === "function" ? value(previous ?? baseline) : value;
    return formChanged(next, baseline) ? next : null;
  });
  return [input ?? baseline, change];
}

function comboForm(combo) {
  return {
    bindingRaw: combo?.binding ?? "",
    positionsRaw: combo?.positions.join(" ") ?? "",
    layersRaw: combo?.layers.join(" ") ?? "",
    timeoutMsRaw: combo?.timeoutMsRange ? String(combo.timeoutMs) : "",
  };
}

function macroForm(macro) {
  return {
    bindingDrafts: Object.fromEntries((macro?.bindingEntries || []).map((entry, index) => [index, entry.raw])),
    fullBindingList: true,
    waitMsRaw: macro?.waitMsRange ? String(macro.waitMs) : "",
    tapMsRaw: macro?.tapMsRange ? String(macro.tapMs) : "",
  };
}

function trackballForm(settings) {
  return {
    automouseLayerRaw: settings?.automouseLayer?.value.trim() ?? "",
    scrollLayersRaw: settings?.scrollLayers?.raw.trim() ?? "",
  };
}

function sensorForm(binding) {
  return { behavior: binding.behavior, incKey: binding.incKey ?? "", decKey: binding.decKey ?? "" };
}

const formChanged = (input, baseline) => JSON.stringify(input) !== JSON.stringify(baseline);

function App() {
  const [keymapSource, setKeymapSource] = useState(initialKeymapSource);
  const [saveStatus, setSaveStatus] = useState(EMPTY_SAVE_STATUS);
  const saveEndpointAvailable = import.meta.env.DEV;
  const document = useMemo(() => {
    const parsed = parseKeymap(keymapSource);
    const physicalLayout = roBaMetadata.layouts.default_layout.layout.map((key, position) => ({
      ...key,
      position,
      thumb: position >= 37 && position <= 41,
      side: key.x < 6.25 ? "L" : "R",
    }));
    return {
      ...parsed,
      physicalLayout,
      dtsPhysicalKeyCount: countDtsPhysicalKeys(dtsiSource),
      metadataSensors: roBaMetadata.sensors || [],
    };
  }, [keymapSource]);

  const [activeLayer, setActiveLayer] = useState(0);
  const [selectedPosition, setSelectedPosition] = useState(0);
  const [editingKind, setEditingKind] = useState("binding");
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("Bindings");
  const [search, setSearch] = useState("");
  const [pendingChanges, setPendingChanges] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const shortcutsRef = useRef(null);
  const [selectedComboName, setSelectedComboName] = useState("");
  const [isAddingCombo, setIsAddingCombo] = useState(false);
  const [newComboDraft, setNewComboDraft] = useState(() => createEmptyComboDraft([]));
  const [newComboInitial, setNewComboInitial] = useState(newComboDraft);
  const [selectedMacroName, setSelectedMacroName] = useState("");
  const [isAddingMacro, setIsAddingMacro] = useState(false);
  const [newMacroDraft, setNewMacroDraft] = useState(() => createEmptyMacroDraft([]));
  const [newMacroInitial, setNewMacroInitial] = useState(newMacroDraft);
  const [sensorInputs, setSensorDrafts] = useState({});
  const [selectedSensorLayerIndex, setSelectedSensorLayerIndex] = useState(null);
  const [sensorInsertLayerIndex, setSensorInsertLayerIndex] = useState("");
  const [sensorInsertBehavior, setSensorInsertBehavior] = useState("&inc_dec_kp");
  const [captureMode, setCaptureMode] = useState(false);
  const [captureStatus, setCaptureStatus] = useState(null);
  const [captureContext, setCaptureContext] = useState({ type: "binding" });
  const [pickerContext, setPickerContext] = useState(null);
  const [pickerDirty, setPickerDirty] = useState(false);
  const [showSavedLayout, setShowSavedLayout] = useState(false);
  const lastValidLayout = useRef(null);
  const [fileBusy, setFileBusy] = useState(saveEndpointAvailable);
  const fileOperation = useRef(saveEndpointAvailable);
  const [keymapBackups, setKeymapBackups] = useState([]);

  const layerNames = document.layers.map((layer) => layer.name);
  const currentLayer = document.layers[activeLayer] || document.layers[0];
  const selectedCombo = isAddingCombo ? null : document.combos.find((combo) => combo.name === selectedComboName);
  const selectedBinding = currentLayer.bindings[selectedPosition] || "&trans";
  const selectedEntry = currentLayer.bindingEntries?.[selectedPosition];
  const selectedDraftId = getDraftId(activeLayer, selectedPosition);
  const selectedPendingChange = pendingChanges.find((change) => change.id === selectedDraftId);
  const selectedComboDraftIds = selectedCombo
    ? [
        `combo-${selectedCombo.name}-binding`,
        `combo-${selectedCombo.name}-positions`,
        `combo-${selectedCombo.name}-layers`,
        `combo-${selectedCombo.name}-timeout-ms`,
      ]
    : [];
  const selectedComboPendingCount = pendingChanges.filter((change) => selectedComboDraftIds.includes(change.id)).length;
  const selectedMacro = isAddingMacro ? null : document.macros.find((macro) => macro.name === selectedMacroName);
  const selectedMacroDraftIds = selectedMacro
    ? [
        `macro-${selectedMacro.name}-bindings`,
        ...(selectedMacro.bindingEntries || []).map((_, index) => `macro-${selectedMacro.name}-binding-${index}`),
        `macro-${selectedMacro.name}-wait-ms`,
        `macro-${selectedMacro.name}-tap-ms`,
      ]
    : [];
  const selectedMacroPendingCount = pendingChanges.filter((change) => selectedMacroDraftIds.includes(change.id)).length;
  const selectedParsed = describeBinding(selectedBinding, layerNames);
  const selectedRange = selectedEntry?.sourceRange;
  const bindingBaseline = selectedPendingChange?.nextRaw ?? selectedEntry?.raw ?? selectedBinding;
  const [effectiveDraftBinding, setDraftBinding] = useFormDraft(bindingBaseline);
  const bindingDirty = effectiveDraftBinding !== bindingBaseline;
  const editorState = useMemo(
    () => buildEditorState(keymapSource, selectedEntry, effectiveDraftBinding, document.layers),
    [keymapSource, selectedEntry, effectiveDraftBinding, document.layers],
  );
  const pendingState = useMemo(
    () => buildPendingChangesState(keymapSource, pendingChanges, document.layers, { keyCount: document.physicalLayout.length }),
    [keymapSource, pendingChanges, document.layers, document.physicalLayout.length],
  );
  const queuedDocument = useMemo(
    () => pendingState.valid ? parseKeymap(pendingState.nextSource) : document,
    [pendingState, document],
  );
  const comboBaseline = comboForm(queuedDocument.combos.find((combo) => combo.name === selectedCombo?.name));
  const [comboDraft, setComboDraft] = useFormDraft(comboBaseline);
  const macroBaseline = macroForm(queuedDocument.macros.find((macro) => macro.name === selectedMacro?.name));
  const [macroDraft, setMacroDraft] = useFormDraft(macroBaseline);
  const trackballBaseline = trackballForm(queuedDocument.trackballSettings);
  const [trackballDraft, setTrackballDraft] = useFormDraft(trackballBaseline);
  const sensorBaseline = Object.fromEntries(document.layers.flatMap((layer) => {
    const saved = layer.sensorBindings[0];
    if (saved?.behavior !== "&inc_dec_kp" && saved?.behavior !== "&inc_dec_cp") return [];
    const queued = queuedDocument.layers[layer.id]?.sensorBindings[0];
    return [[layer.id, sensorForm(queued ?? saved)]];
  }));
  const sensorDrafts = { ...sensorBaseline, ...sensorInputs };
  const layerRenameDraftId = `layer-${activeLayer}-rename`;
  const layerRenamePending = pendingChanges.find((change) => change.id === layerRenameDraftId);
  const layerRenameBaseline = layerRenamePending?.nextRaw ?? currentLayer.name;
  const [layerRenameDraft, setLayerRenameDraft] = useFormDraft(layerRenameBaseline);
  const layerNameDirty = layerRenameDraft !== layerRenameBaseline;
  const comboDirty = isAddingCombo
    ? formChanged(newComboDraft, newComboInitial)
    : Boolean(selectedCombo && formChanged(comboDraft, comboBaseline));
  const macroDirty = isAddingMacro
    ? formChanged(newMacroDraft, newMacroInitial)
    : Boolean(selectedMacro && formChanged(macroDraft, macroBaseline));
  const editorDirty = editingKind === "binding" ? bindingDirty : editingKind === "combo" ? comboDirty : macroDirty;
  const hasInput = editorDirty || layerNameDirty || pickerDirty || formChanged(trackballDraft, trackballBaseline) ||
    Object.keys(sensorInputs).some((id) => formChanged(sensorInputs[id], sensorBaseline[id]));
  const hasUnsaved = hasInput || pendingChanges.length > 0;

  const comboPreviewState = useMemo(
    () => buildComboPreviewState(
      keymapSource,
      selectedCombo,
      comboDraft,
      document.physicalLayout.length,
      document.layers.length,
    ),
    [keymapSource, selectedCombo, comboDraft, document.physicalLayout.length, document.layers.length],
  );
  const newComboPreviewState = useMemo(
    () => buildNewComboPreviewState(
      keymapSource,
      newComboDraft,
      queuedDocument.combos,
      document.physicalLayout.length,
      document.layers.length,
    ),
    [keymapSource, newComboDraft, queuedDocument.combos, document.physicalLayout.length, document.layers.length],
  );
  const macroPreviewState = useMemo(
    () => buildMacroPreviewState(keymapSource, selectedMacro, macroDraft),
    [keymapSource, selectedMacro, macroDraft],
  );
  const newMacroPreviewState = useMemo(
    () => buildNewMacroPreviewState(keymapSource, newMacroDraft, queuedDocument.macros),
    [keymapSource, newMacroDraft, queuedDocument.macros],
  );
  const changeForBinding = () => buildDraftChange({
    layerIndex: activeLayer, layerName: currentLayer.name, position: selectedPosition,
    entry: selectedEntry, nextRaw: effectiveDraftBinding,
  });
  const keyInputState = editorState.changed
    ? buildPendingChangesState(keymapSource, [changeForBinding()], document.layers)
    : null;
  const keyInputValid = editorState.canEdit && (keyInputState?.valid ?? effectiveDraftBinding === selectedEntry?.raw);

  const comboChanges = () => buildComboDraftChanges({
    source: keymapSource, combo: selectedCombo, ...comboDraft, layerCount: document.layers.length,
  });
  const macroChanges = () => buildMacroDraftChanges({ source: keymapSource, macro: selectedMacro, ...macroDraft });
  const layerRenameChange = () => buildLayerRenameDraftChange({
    layerIndex: activeLayer, currentName: currentLayer.name, nextName: layerRenameDraft.trim(),
    nameRange: currentLayer.nameRange,
  });

  const liveChanges = pendingState.valid ? pendingChanges : [];
  let diagramDrafts = liveChanges;
  let diagramError = pendingChanges.length && !pendingState.valid ? pendingState.message : "";
  if (editingKind === "binding" && bindingDirty) {
    if (keyInputValid) diagramDrafts = upsertDraftChange(diagramDrafts, changeForBinding());
    else diagramError = keyInputState?.message ?? editorState.message;
  }
  if (editingKind === "combo" && comboDirty) {
    const preview = isAddingCombo ? newComboPreviewState : comboPreviewState;
    if (preview.valid) {
      diagramDrafts = isAddingCombo
        ? upsertDraftChange(diagramDrafts, preview.change)
        : upsertDraftChanges(diagramDrafts.filter((change) => !selectedComboDraftIds.includes(change.id)), comboChanges());
    } else diagramError = preview.message;
  }
  if (editingKind === "macro" && macroDirty) {
    const preview = isAddingMacro ? newMacroPreviewState : macroPreviewState;
    if (preview.valid) {
      diagramDrafts = isAddingMacro
        ? upsertDraftChange(diagramDrafts, preview.change)
        : upsertDraftChanges(diagramDrafts.filter((change) => !selectedMacroDraftIds.includes(change.id)), macroChanges());
    } else diagramError = preview.message;
  }
  if (layerNameDirty) {
    diagramDrafts = upsertDraftChange(diagramDrafts, layerRenameChange());
  }

  let editedDocument = queuedDocument;
  if (diagramDrafts !== liveChanges) {
    const preview = buildPendingChangesState(keymapSource, diagramDrafts, document.layers, {
      keyCount: document.physicalLayout.length,
    });
    if (preview.valid || !diagramDrafts.length) editedDocument = parseKeymap(preview.nextSource);
    else diagramError = preview.message;
  }
  const layoutContext = JSON.stringify([activeLayer, selectedPosition, editingKind, selectedComboName,
    selectedMacroName, isAddingCombo, isAddingMacro]);
  const previousLayout = lastValidLayout.current;
  const showLastValidLayout = Boolean(diagramError && previousLayout?.source === keymapSource &&
    previousLayout.changes === pendingChanges && previousLayout.context === layoutContext);
  useEffect(() => {
    if (!diagramError) {
      lastValidLayout.current = { source: keymapSource, changes: pendingChanges, context: layoutContext, document: editedDocument };
    }
  }, [diagramError, keymapSource, pendingChanges, layoutContext, editedDocument]);
  if (showLastValidLayout) editedDocument = previousLayout.document;
  const layoutDocument = showSavedLayout ? document : editedDocument;
  const layoutLayer = layoutDocument.layers[currentLayer.id];
  const layoutLayerNames = layoutDocument.layers.map((layer) => layer.name);
  const keyboardChanges = showSavedLayout ? new Map() : getKeyboardChanges(document, editedDocument, currentLayer.id);
  const layoutCombo = editingKind === "combo" && layoutDocument.combos.find(
    (combo) => combo.name === (isAddingCombo ? newComboDraft.nameRaw.trim() : selectedComboName),
  );
  const comboHighlightPositions = new Set(layoutCombo?.positions ?? []);
  const comboSavedOnlyPositions = !showSavedLayout && editingKind === "combo" && selectedCombo
    ? new Set(selectedCombo.positions.filter((position) => !comboHighlightPositions.has(position)))
    : new Set();

  const markdown = useMemo(() => buildMarkdown(document), [document]);
  const diagnostics = getDiagnostics(document);

  const loadKeymapBackups = async () => {
    if (!saveEndpointAvailable) return;
    try {
      const response = await fetch("/__roba/keymap-backups");
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload.ok) setKeymapBackups(payload.backups || []);
    } catch {
      setKeymapBackups([]);
    }
  };

  useEffect(() => {
    if (!saveEndpointAvailable) return;
    const controller = new AbortController();
    const { signal } = controller;
    fetch("/__roba/keymap-source", { signal })
      .then((response) => response.json())
      .then((payload) => {
        if (signal.aborted) return;
        if (!payload.ok) throw new Error(payload.message || "読み込みに失敗しました。");
        if (!parseKeymap(payload.source).layers.length) throw new Error("レイヤーを読み取れませんでした。");
        setKeymapSource(payload.source);
      })
      .catch((error) => {
        if (!signal.aborted) setSaveStatus({ tone: "error", title: "読み込み失敗", message: error.message });
      })
      .finally(() => {
        if (signal.aborted) return;
        fileOperation.current = false;
        setFileBusy(false);
      });
    loadKeymapBackups();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!hasUnsaved && !fileBusy) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsaved, fileBusy]);

  useEffect(() => {
    if (!captureMode || pickerContext) return;

    const handleKeyDown = (event) => {
      const result = captureKeyToBinding({
        // 支援ツール等で物理コードが空でも Escape / Tab などの操作キーを扱う。
        code: event.code || (event.key === " " ? "Space" : event.key),
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        repeat: event.repeat,
        isComposing: event.isComposing,
      });

      if (result.cancelled) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setCaptureMode(false);
        setCaptureStatus(null);
        return;
      }

      if (result.ignored) return;

      if (result.unsupported) {
        setCaptureStatus(`未対応: ${result.reason} →「キーを選ぶ」で選択できます`);
        return;
      }

      // supported binding
      event.preventDefault();
      event.stopImmediatePropagation();
      const target = captureContext || { type: "binding" };
      if (target.type === "binding") {
        if (!editorState.canEdit) {
          setCaptureStatus("このキーは編集できません");
          return;
        }
        setDraftBinding(result.binding);
        setActiveTab("Preview");
      } else if (target.type === "combo") {
        setComboDraft((prev) => ({ ...prev, bindingRaw: result.binding }));
      } else if (target.type === "new-combo") {
        setNewComboDraft((prev) => ({ ...prev, bindingRaw: result.binding }));
      } else if (target.type === "macro") {
        setMacroDraft((prev) => ({
          ...prev,
          bindingDrafts: { ...prev.bindingDrafts, [target.index]: result.binding },
        }));
      } else if (target.type === "new-macro") {
        setNewMacroDraft((prev) => ({ ...prev, bindingsRaw: result.binding }));
      }
      setCaptureStatus(`入力: ${result.binding}`);
      setSaveStatus(EMPTY_SAVE_STATUS);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [captureMode, captureContext, editorState.canEdit, pickerContext]);

  useEffect(() => {
    setCaptureMode(false);
    setCaptureStatus(null);
  }, [pickerContext, editingKind, activeLayer, selectedPosition]);

  const applyLoadedSource = (source) => {
    const layers = parseKeymap(source).layers;
    const layer = layers[activeLayer] ?? layers[0];
    if (!layer) throw new Error("レイヤーを読み取れませんでした。");
    setKeymapSource(source);
    setPendingChanges([]);
    setUndoStack([]);
    setRedoStack([]);
    setDraftBinding(null);
    setComboDraft(null);
    setMacroDraft(null);
    setLayerRenameDraft(null);
    setTrackballDraft(null);
    setSensorDrafts({});
    setIsAddingCombo(false);
    setIsAddingMacro(false);
    setSelectedSensorLayerIndex(null);
    setSensorInsertLayerIndex("");
    setSensorInsertBehavior("&inc_dec_kp");
    setActiveLayer(layer.id);
    setSelectedPosition(Math.min(selectedPosition, layer.bindings.length - 1));
    setCaptureMode(false);
    setCaptureStatus(null);
  };

  const runFileOperation = async (operation) => {
    if (fileOperation.current || !saveEndpointAvailable) return;
    fileOperation.current = true;
    setFileBusy(true);
    setCaptureMode(false);
    try {
      await operation();
    } finally {
      fileOperation.current = false;
      setFileBusy(false);
    }
  };

  const reloadKeymapSource = () => runFileOperation(async () => {
    if (hasUnsaved && !window.confirm("再読み込みすると未追加の入力と追加済みの変更を破棄します。続けますか？")) return;
    setSaveStatus({ tone: "saving", title: "再読み込み中", message: "config/roBa.keymap を読み込んでいます。" });
    try {
      const response = await fetch("/__roba/keymap-source");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || "Reload failed.");
      applyLoadedSource(payload.source);
      setSaveStatus({ tone: "ok", title: "再読み込み完了", message: "config/roBa.keymap を読み込みました。" });
      loadKeymapBackups();
    } catch (error) {
      setSaveStatus({ tone: "error", title: "再読み込み失敗", message: error.message });
    }
  });

  const saveSelectedBinding = () => {
    if (!keyInputValid || !editorState.changed) return;
    const change = changeForBinding();
    return saveChanges([change], change);
  };

  const updateKeymapDrawerAfterSave = async () => {
    try {
      const response = await fetch("/__roba/update-keymap-drawer", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (payload.ok) {
        return `keymap-drawer regenerated (${payload.yamlPath}, ${payload.svgPath}).`;
      }
      if (payload.available === false) {
        return "keymap CLI not found on PATH. Update keymap-drawer manually.";
      }
      return payload.message || "keymap-drawer update failed.";
    } catch (error) {
      return `keymap-drawer update failed: ${error.message}`;
    }
  };

  const saveChanges = (changes, single) => runFileOperation(async () => {
    setSaveStatus({ tone: "saving", title: "保存中", message: "内容を確認し、バックアップを作成しています。" });
    try {
      const request = async (forceDrawer) => {
        const response = await fetch("/__roba/save-bindings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourcePath: "config/roBa.keymap", changes, expectedSource: keymapSource, forceDrawer,
          }),
        });
        const payload = await response.json();
        if (payload.error === "DRAWER_DIRTY" && !forceDrawer) {
          if (window.confirm(`次のファイルに未コミットの変更があります。保存後の図の生成で上書きされる可能性があります。続けますか？\n\n${payload.paths.join("\n")}`)) {
            return request(true);
          }
          return null;
        }
        if (!response.ok || !payload.ok) throw new Error(payload.message || "Save failed.");
        return payload;
      };
      const payload = await request(false);
      if (!payload) {
        setSaveStatus(EMPTY_SAVE_STATUS);
        return;
      }
      setKeymapSource(payload.source);
      if (single) {
        const remaining = rebaseAfterKeySave(pendingChanges, single);
        setPendingChanges(remaining);
        setUndoStack(rebaseHistoryAfterKeySave(undoStack, remaining, single));
        setRedoStack(rebaseHistoryAfterKeySave(redoStack, remaining, single));
        setDraftBinding(null);
      } else {
        setPendingChanges([]);
        setUndoStack([]);
        setRedoStack([]);
      }
      setSaveStatus({
        tone: "ok",
        title: single ? "このキーをローカルへ保存しました" : "追加済みの変更を保存しました",
        message: single ? "選択キーを保存しました。他の追加済み変更と未追加の入力は保持しています。"
          : hasInput ? "追加済みの変更を保存しました。未追加の入力は引き続き編集できます。"
            : "バックアップを作成して config/roBa.keymap へ保存しました。",
        backupPath: payload.backupPath,
        drawerMessage: "キーボード図を更新中…",
      });
      const drawerMessage = await updateKeymapDrawerAfterSave();
      setSaveStatus((current) => ({ ...current, drawerMessage }));
      loadKeymapBackups();
    } catch (error) {
      setSaveStatus({ tone: "error", title: "保存失敗", message: error.message });
    }
  });

  const saveAllPendingChanges = () => {
    if (fileOperation.current || !saveEndpointAvailable) return;
    if (!pendingChanges.length || !pendingState.valid) {
      setActiveTab("Preview");
      setPanelOpen(true);
      setSaveStatus({
        tone: pendingChanges.length ? "error" : "idle",
        title: "保存対象を確認してください",
        message: pendingChanges.length ? pendingState.message
          : hasInput ? "未追加の入力があります。一括保存するには「変更に追加」を押してください。"
            : "追加済みの変更はありません。",
      });
      return;
    }
    return saveChanges(pendingChanges);
  };

  const restoreFromBackup = (backup) => runFileOperation(async () => {
    const pendingNote = hasUnsaved ? "\n\n未追加の入力と追加済みの変更を破棄します。" : "";
    if (!window.confirm(`このバックアップを復元しますか？\n\n${backup.path}${pendingNote}`)) return;

    setSaveStatus({
      tone: "saving",
      title: "復元中",
      message: "Backing up the current keymap, then restoring the selected backup.",
      backupPath: "",
      drawerMessage: "",
    });

    try {
      const response = await fetch("/__roba/restore-keymap-backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupPath: backup.path }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Backup restore failed.");
      }

      applyLoadedSource(payload.source);
      setSaveStatus({
        tone: "ok",
        title: "復元完了",
        message: `Restored ${payload.restoredPath}. Current file was backed up before restore.`,
        backupPath: payload.backupPath,
        drawerMessage: "Updating keymap-drawer...",
      });
      setActiveTab("Preview");
      const drawerMessage = await updateKeymapDrawerAfterSave();
      setSaveStatus((current) => ({ ...current, drawerMessage }));
      loadKeymapBackups();
    } catch (error) {
      setSaveStatus({
        tone: "error",
        title: "復元失敗",
        message: error.message,
        backupPath: "",
        drawerMessage: "",
      });
    }
  });

  const leaveEditor = (nextLayer = activeLayer, keepEditor = false) => {
    if (fileOperation.current) return false;
    const losesLayerName = nextLayer !== activeLayer && layerNameDirty;
    if (((!keepEditor && editorDirty) || losesLayerName) &&
        !window.confirm("未追加の入力があります。入力を破棄して移動しますか？")) return false;
    if (!keepEditor) {
      setDraftBinding(null);
      setComboDraft(null);
      setMacroDraft(null);
      setIsAddingCombo(false);
      setIsAddingMacro(false);
      setCaptureMode(false);
      setCaptureStatus(null);
    }
    if (nextLayer !== activeLayer) setLayerRenameDraft(null);
    return true;
  };

  const selectBinding = (layerId, position) => {
    const same = editingKind === "binding" && layerId === activeLayer && position === selectedPosition;
    if (!leaveEditor(layerId, same)) return;
    setEditingKind("binding");
    setActiveLayer(layerId);
    setSelectedPosition(position);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const selectCombo = (combo) => {
    const layerId = combo.layers[0] ?? activeLayer;
    const same = editingKind === "combo" && !isAddingCombo && selectedComboName === combo.name;
    if (!leaveEditor(layerId, same)) return;
    setEditingKind("combo");
    setIsAddingCombo(false);
    setSelectedComboName(combo.name);
    if (combo.layers.length) setActiveLayer(combo.layers[0]);
    if (combo.positions.length) setSelectedPosition(combo.positions[0]);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const startNewCombo = () => {
    if (!leaveEditor()) return;
    setEditingKind("combo");
    setIsAddingCombo(true);
    setSelectedComboName("");
    const initial = createEmptyComboDraft(queuedDocument.combos);
    setNewComboDraft(initial);
    setNewComboInitial(initial);
    setActiveTab("Combos");
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const commitPendingChanges = (newChanges) => {
    if (fileOperation.current || !formChanged(newChanges, pendingChanges)) return;
    setUndoStack((prev) => [...prev.slice(-49), pendingChanges]);
    setRedoStack([]);
    setPendingChanges(newChanges);
  };

  const undo = () => {
    if (fileOperation.current || undoStack.length === 0) return;
    setRedoStack((prev) => [...prev, pendingChanges]);
    setUndoStack((prev) => prev.slice(0, -1));
    setPendingChanges(undoStack[undoStack.length - 1]);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const redo = () => {
    if (fileOperation.current || redoStack.length === 0) return;
    setUndoStack((prev) => [...prev, pendingChanges]);
    setRedoStack((prev) => prev.slice(0, -1));
    setPendingChanges(redoStack[redoStack.length - 1]);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  shortcutsRef.current = { undo, redo, saveAllPendingChanges, blocked: captureMode || Boolean(pickerContext), pickerOpen: Boolean(pickerContext) };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!shortcutsRef.current?.pickerOpen) shortcutsRef.current?.saveAllPendingChanges();
        return;
      }
      if (shortcutsRef.current?.blocked) return;
      const tag = e.target?.tagName?.toLowerCase();
      const isEditable = tag === "input" || tag === "textarea" || e.target?.isContentEditable;
      if (e.ctrlKey && !e.shiftKey && e.key === "z") {
        if (!isEditable) { e.preventDefault(); shortcutsRef.current?.undo(); }
        return;
      }
      if ((e.ctrlKey && e.shiftKey && e.key === "z") || (e.ctrlKey && !e.shiftKey && e.key === "y")) {
        if (!isEditable) { e.preventDefault(); shortcutsRef.current?.redo(); }
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const addSelectedDraft = () => {
    if (!keyInputValid || !bindingDirty) return;
    commitPendingChanges(upsertDraftChange(pendingChanges, changeForBinding()));
    setDraftBinding(null);
    setSaveStatus(EMPTY_SAVE_STATUS);
    setActiveTab("Preview");
  };

  const removeSelectedDraft = () => {
    commitPendingChanges(removeDraftChange(pendingChanges, selectedDraftId));
    setDraftBinding(null);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const clearPendingChanges = () => {
    commitPendingChanges([]);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const addLayerRenameDraft = () => {
    if (!currentLayer.nameRange || !layerNameDirty) return;
    commitPendingChanges(upsertDraftChange(pendingChanges, layerRenameChange()));
    setLayerRenameDraft(null);
    setSaveStatus(EMPTY_SAVE_STATUS);
    setActiveTab("Preview");
  };

  const removeLayerRenameDraft = () => {
    commitPendingChanges(removeDraftChange(pendingChanges, layerRenameDraftId));
    setLayerRenameDraft(null);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const addSelectedComboDraft = () => {
    if (!selectedCombo || !comboDirty || !comboPreviewState.valid) return;
    const rest = pendingChanges.filter((change) => !selectedComboDraftIds.includes(change.id));
    commitPendingChanges(upsertDraftChanges(rest, comboChanges()));
    setComboDraft(null);
    setSaveStatus(EMPTY_SAVE_STATUS);
    setActiveTab("Preview");
  };

  const removeSelectedComboDraft = () => {
    commitPendingChanges(pendingChanges.filter((change) => !selectedComboDraftIds.includes(change.id)));
    setComboDraft(null);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const addNewComboDraft = () => {
    if (!newComboPreviewState.changed || !newComboPreviewState.valid) return;
    const changes = buildNewComboDraftChanges({
      source: keymapSource,
      draft: newComboDraft,
      existingCombos: queuedDocument.combos,
      keyCount: document.physicalLayout.length,
      layerCount: document.layers.length,
    });
    commitPendingChanges(upsertDraftChanges(pendingChanges, changes));
    setIsAddingCombo(false);
    setSaveStatus(EMPTY_SAVE_STATUS);
    setActiveTab("Preview");
  };

  const removeNewComboDraft = () => {
    const id = `combo-${newComboDraft.nameRaw.trim()}-node-insert`;
    commitPendingChanges(removeDraftChange(pendingChanges, id));
    setNewComboDraft(newComboInitial);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const selectMacro = (macro) => {
    const same = editingKind === "macro" && !isAddingMacro && selectedMacroName === macro.name;
    if (!leaveEditor(activeLayer, same)) return;
    setEditingKind("macro");
    setIsAddingMacro(false);
    setSelectedMacroName(macro.name);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const startNewMacro = () => {
    if (!leaveEditor()) return;
    setEditingKind("macro");
    setIsAddingMacro(true);
    setSelectedMacroName("");
    const initial = createEmptyMacroDraft(queuedDocument.macros);
    setNewMacroDraft(initial);
    setNewMacroInitial(initial);
    setActiveTab("Macros");
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const handleSvgKeyClick = (position) => {
    if (editingKind === "combo" && (selectedCombo || isAddingCombo)) {
      const sourceRaw = isAddingCombo ? newComboDraft.positionsRaw : comboDraft.positionsRaw;
      const posSet = new Set(sourceRaw.trim().split(/\s+/).filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n >= 0));
      if (posSet.has(position)) posSet.delete(position);
      else posSet.add(position);
      const positionsRaw = [...posSet].sort((a, b) => a - b).join(" ");
      if (isAddingCombo) setNewComboDraft((prev) => ({ ...prev, positionsRaw }));
      else setComboDraft((prev) => ({ ...prev, positionsRaw }));
      setSaveStatus(EMPTY_SAVE_STATUS);
    } else {
      selectBinding(activeLayer, position);
    }
  };

  const addSelectedMacroDraft = () => {
    if (!selectedMacro || !macroDirty || !macroPreviewState.valid) return;
    const rest = pendingChanges.filter((change) => !selectedMacroDraftIds.includes(change.id));
    commitPendingChanges(upsertDraftChanges(rest, macroChanges()));
    setMacroDraft(null);
    setSaveStatus(EMPTY_SAVE_STATUS);
    setActiveTab("Preview");
  };

  const removeSelectedMacroDraft = () => {
    commitPendingChanges(pendingChanges.filter((change) => !selectedMacroDraftIds.includes(change.id)));
    setMacroDraft(null);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const addNewMacroDraft = () => {
    if (!newMacroPreviewState.changed || !newMacroPreviewState.valid) return;
    const changes = buildNewMacroDraftChanges({
      source: keymapSource,
      draft: newMacroDraft,
      existingMacros: queuedDocument.macros,
    });
    commitPendingChanges(upsertDraftChanges(pendingChanges, changes));
    setIsAddingMacro(false);
    setSaveStatus(EMPTY_SAVE_STATUS);
    setActiveTab("Preview");
  };

  const removeNewMacroDraft = () => {
    const id = `macro-${newMacroDraft.nameRaw.trim()}-node-insert`;
    commitPendingChanges(removeDraftChange(pendingChanges, id));
    setNewMacroDraft(newMacroInitial);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const sensorLayersWithBindings = document.layers.filter(
    (layer) => layer.sensorBindings.length > 0 &&
      (layer.sensorBindings[0].behavior === "&inc_dec_kp" || layer.sensorBindings[0].behavior === "&inc_dec_cp"),
  );
  const sensorLayersWithoutBindings = document.layers.filter((layer) => layer.sensorBindings.length === 0);
  const effectiveSensorInsertLayerIndex = sensorInsertLayerIndex === "" && sensorLayersWithoutBindings.length
    ? String(sensorLayersWithoutBindings[0].id)
    : sensorInsertLayerIndex;

  const clearSensorInput = (layerIndex) => setSensorDrafts((previous) => {
    const next = { ...previous };
    delete next[layerIndex];
    return next;
  });

  const addSensorDraft = (layerIndex) => {
    const layer = document.layers.find((l) => l.id === layerIndex);
    if (!layer) return;
    const sb = layer.sensorBindings[0];
    if (!sb || (sb.behavior !== "&inc_dec_kp" && sb.behavior !== "&inc_dec_cp")) return;
    const draft = sensorDrafts[layerIndex];
    if (!draft) return;
    const effectiveSensorBinding = { ...sb, behavior: draft.behavior || sb.behavior };
    const change = buildSensorBindingDraftChange({ layer, sensorBinding: effectiveSensorBinding, incKey: draft.incKey, decKey: draft.decKey });
    commitPendingChanges(upsertDraftChange(pendingChanges, change));
    clearSensorInput(layerIndex);
    setSaveStatus(EMPTY_SAVE_STATUS);
    setActiveTab("Preview");
  };

  const addSensorLayerDraft = () => {
    const layerIndex = Number(effectiveSensorInsertLayerIndex);
    const layer = document.layers.find((l) => l.id === layerIndex);
    if (!layer || layer.sensorBindings.length) return;
    const behavior = sensorInsertBehavior || "&inc_dec_kp";
    const incKey = behavior === "&inc_dec_cp" ? "C_VOL_UP" : "PG_UP";
    const decKey = behavior === "&inc_dec_cp" ? "C_VOL_DN" : "PAGE_DOWN";
    const change = buildSensorBindingInsertDraftChange({ source: keymapSource, layer, behavior, incKey, decKey });
    commitPendingChanges(upsertDraftChange(pendingChanges, change));
    setSelectedSensorLayerIndex(layerIndex);
    setSaveStatus(EMPTY_SAVE_STATUS);
    setActiveTab("Preview");
  };

  const deleteSensorBindingDraft = (layerIndex) => {
    const layer = document.layers.find((l) => l.id === layerIndex);
    const sb = layer?.sensorBindings[0];
    if (!layer || !sb) return;
    const change = buildSensorBindingRemoveDraftChange({ source: keymapSource, layer, sensorBinding: sb });
    commitPendingChanges(upsertDraftChange(pendingChanges, change));
    setSaveStatus(EMPTY_SAVE_STATUS);
    setActiveTab("Preview");
  };

  const removeSensorDraft = (layerIndex) => {
    const draftId = `layer-${layerIndex}-sensor-binding`;
    commitPendingChanges(pendingChanges.filter((change) => change.id !== draftId));
    clearSensorInput(layerIndex);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const trackballAutomousePendingId = "trackball-automouse-layer";
  const trackballScrollPendingId = "trackball-scroll-layers";
  const trackballPendingCount = pendingChanges.filter(
    (change) => change.id === trackballAutomousePendingId || change.id === trackballScrollPendingId,
  ).length;

  const addTrackballDraft = () => {
    const ts = document.trackballSettings;
    if (!ts) return;
    const changes = [];
    const automouseChange = buildTrackballAutomouseDraftChange({
      trackballSettings: ts,
      nextRaw: trackballDraft.automouseLayerRaw,
    });
    if (automouseChange) changes.push(automouseChange);
    const scrollChange = buildTrackballScrollLayersDraftChange({
      trackballSettings: ts,
      nextRaw: trackballDraft.scrollLayersRaw,
    });
    if (scrollChange) changes.push(scrollChange);
    const rest = pendingChanges.filter((change) => ![trackballAutomousePendingId, trackballScrollPendingId].includes(change.id));
    commitPendingChanges(upsertDraftChanges(rest, changes));
    setTrackballDraft(null);
    setSaveStatus(EMPTY_SAVE_STATUS);
    setActiveTab("Preview");
  };

  const removeTrackballDraft = () => {
    commitPendingChanges(pendingChanges.filter(
      (change) => change.id !== trackballAutomousePendingId && change.id !== trackballScrollPendingId,
    ));
    setTrackballDraft(null);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const pickerInitialBinding = pickerContext?.type === "binding"
    ? effectiveDraftBinding
    : pickerContext?.type === "combo"
      ? comboDraft.bindingRaw
      : pickerContext?.type === "new-combo"
        ? newComboDraft.bindingRaw
      : pickerContext?.type === "macro"
        ? macroDraft.bindingDrafts?.[pickerContext.index] ?? selectedMacro?.bindingEntries?.[pickerContext.index]?.raw
      : pickerContext?.type === "new-macro"
        ? newMacroDraft.bindingsRaw
      : pickerContext?.type === "sensor-inc"
        ? `&kp ${sensorDrafts[pickerContext.layerIndex]?.incKey || ""}`
      : pickerContext?.type === "sensor-dec"
        ? `&kp ${sensorDrafts[pickerContext.layerIndex]?.decKey || ""}`
        : "";

  return (
    <div className="appShell">
      <header className="topBar">
        <div className="brandMark">rB</div>
        <div>
          <h1>roBa Keymap Viewer</h1>
          <p>キー配置の確認・編集</p>
        </div>
        <div className="topBarActions">
          <button type="button" disabled={!saveEndpointAvailable || fileBusy} onClick={reloadKeymapSource}>
            ファイルを再読み込み
          </button>
          <a href="https://zmk.studio/" target="_blank" rel="noreferrer">ZMK Studio</a>
          <a href="https://nickcoutsos.github.io/keymap-editor/" target="_blank" rel="noreferrer">Keymap Editor</a>
        </div>
      </header>

      <section className="statusStrip" aria-label="status">
        <StatusPill label="ファイル" value="config/roBa.keymap" tone="ok" />
        <StatusPill label="キー数" value={`${document.physicalLayout.length} キー`} tone="ok" />
        <StatusPill label="未追加の入力" value={hasInput ? "あり（未保存）" : "なし"} tone={hasInput ? "warn" : "info"} />
        <StatusPill label="追加済み" value={`${pendingChanges.length} 件`} tone={pendingChanges.length ? "warn" : "info"} />
        <StatusPill label="Studio" value="公式アプリを使用" tone="warn" />
        <StatusPill label="処理結果" value={saveStatus.title || "操作できます"} tone={getStatusTone(saveStatus)} />
      </section>

      <div className="selectionNotice" role="status" aria-atomic="true">
        {editingKind === "binding" ? `選択中: ${currentLayer.name} / キー ${selectedPosition} / ${selectedParsed.display}` : editingKind === "combo" ? `選択中: コンボ ${isAddingCombo ? newComboDraft.nameRaw : selectedComboName} / 対象キー ${isAddingCombo ? newComboDraft.positionsRaw : comboDraft.positionsRaw}` : `選択中: マクロ ${isAddingMacro ? newMacroDraft.nameRaw : selectedMacroName}`}
      </div>
      <SaveStatusPanel status={saveStatus} />
      <nav className="workspaceLinks" aria-label="操作領域へ移動">
        <a href="#editor-heading">選択項目を編集</a>
        <a href="#viewer-sections" onClick={() => setPanelOpen(true)}>一覧・変更・保存へ</a>
      </nav>
      <main className="workspace" inert={fileBusy}>
        <aside className="layerRail">
          <div className="railTitle">レイヤー</div>
          {document.layers.map((layer) => (
            <button
              className={layer.id === activeLayer ? "layerButton active" : "layerButton"}
              aria-pressed={layer.id === activeLayer}
              key={layer.name}
              onClick={() => selectBinding(layer.id, Math.min(selectedPosition, layer.bindings.length - 1))}
            >
              <span>{layer.id}</span>
              <strong>{layer.name}</strong>
              <small>{layer.bindings.length}</small>
            </button>
          ))}
          <details className="layerRenameSection">
            <summary>レイヤー名を変更</summary>
            <span className="eyebrow">Layer {currentLayer.id} · {currentLayer.name}</span>
            <LayerRenameRow
              currentName={layerRenameBaseline}
              draft={layerRenameDraft}
              pending={Boolean(layerRenamePending)}
              disabled={!currentLayer.nameRange}
              onChange={(value) => {
                setLayerRenameDraft(value);
                setSaveStatus(EMPTY_SAVE_STATUS);
              }}
              onAdd={addLayerRenameDraft}
              onRemove={removeLayerRenameDraft}
            />
          </details>
          <div className="railNote">
            <strong>Canonical</strong>
            <span>config/roBa.keymap</span>
            <span>config/roBa.json</span>
          </div>
        </aside>

        <section className="visualPane">
          <div className="paneHeader">
            <div>
              <span className="eyebrow">Layer {currentLayer.id}</span>
              <h2>{layoutLayer.name}</h2>
            </div>
            <div className="legend">
              <span><i className="editDirect" /> Studio direct</span>
              <span><i className="editBuild" /> Build required</span>
              <span><i className="editSource" /> Source only</span>
            </div>
          </div>
          <p className="keyboardHelp" id="keyboard-help">矢印キーで移動、Enter / Space で選択。Tab で編集欄へ進みます。</p>
          <div className="layoutMode" role="group" aria-label="配置の比較">
            <button type="button" aria-pressed={!showSavedLayout} onClick={() => setShowSavedLayout(false)}>編集中の配置</button>
            <button type="button" aria-pressed={showSavedLayout} onClick={() => setShowSavedLayout(true)}>ローカル保存済みの配置</button>
          </div>
          <p className="keyboardHelp">ローカルファイルの配置を表示しています。実機の現在の配置は ZMK Studio で確認してください。</p>
          {diagramError && (
            <p className="diagramError" role="alert">
              図へ反映できない変更があります。{editorMessage(diagramError)}
              {showLastValidLayout && !showSavedLayout && " 直前に確認できた配置を表示しています。"}
            </p>
          )}
          <div className="keyboardScroll">
          <KeyboardSvg
            keys={document.physicalLayout}
            bindings={layoutLayer.bindings}
            layerNames={layoutLayerNames}
            changes={keyboardChanges}
            selectedPosition={selectedPosition}
            highlightedPositions={comboHighlightPositions}
            savedOnlyPositions={comboSavedOnlyPositions}
            onSelect={handleSvgKeyClick}
            comboMode={editingKind === "combo"}
          />
          </div>
          {keyboardChanges.size > 0 && (
            <details className="diagramChanges">
              <summary>◆ 変更したキーの内容（{keyboardChanges.size} キー）</summary>
              <ul>
                {[...keyboardChanges].sort(([a], [b]) => a - b).map(([position, messages]) => (
                  <li key={position}>キー {position}　{messages.join(" / ")}</li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <aside className="detailPane">
          <div className="paneHeader compact">
            <div>
              <span className="eyebrow">選択中の項目を編集</span>
              <h2 id="editor-heading" tabIndex={-1}>{editingKind === "combo" ? (isAddingCombo ? "新しいコンボ" : `コンボ: ${selectedCombo?.name || "未選択"}`) : editingKind === "macro" ? (isAddingMacro ? "新しいマクロ" : `マクロ: ${selectedMacro?.name || "未選択"}`) : `${currentLayer.name} · キー ${selectedPosition} · ${selectedParsed.display}`}</h2>
            </div>
          </div>
          <p className="editState" role="status">
            {editorDirty ? "未追加の入力あり。一括保存するには「変更に追加」または「変更を更新」を押してください。"
              : (selectedPendingChange && editingKind === "binding") || (editingKind === "combo" && selectedComboPendingCount) || (editingKind === "macro" && selectedMacroPendingCount)
                ? "追加済みの変更あり。一括保存の対象です。"
                : "選択項目に未保存の変更はありません。"}
          </p>
          {editingKind === "combo" && !selectedCombo && !isAddingCombo && <p className="emptySelection">コンボ一覧から選ぶか、新しいコンボを作成してください。</p>}
          {editingKind === "macro" && !selectedMacro && !isAddingMacro && <p className="emptySelection">マクロ一覧から選ぶか、新しいマクロを作成してください。</p>}
          {editingKind === "combo" && selectedCombo && (
            <ComboDetailPanel
              combo={selectedCombo}
              draft={comboDraft}
              previewState={{ ...comboPreviewState, changed: comboDirty }}
              pendingCount={selectedComboPendingCount}
              onAddDraft={addSelectedComboDraft}
              onRemoveDraft={removeSelectedComboDraft}
              onDraftChange={(nextDraft) => {
                setComboDraft(nextDraft);
                setSaveStatus(EMPTY_SAVE_STATUS);
              }}
              onPickBinding={() => setPickerContext({ type: "combo" })}
              captureActive={captureMode && captureContext?.type === "combo"}
              onCaptureBinding={() => {
                setCaptureContext({ type: "combo" });
                setCaptureMode(true);
                setCaptureStatus(null);
              }}
            />
          )}
          {editingKind === "combo" && isAddingCombo && (
            <NewComboDetailPanel
              draft={newComboDraft}
              previewState={newComboPreviewState}
              pending={pendingChanges.some((change) => change.id === `combo-${newComboDraft.nameRaw.trim()}-node-insert`)}
              onAddDraft={addNewComboDraft}
              onRemoveDraft={removeNewComboDraft}
              onDraftChange={(nextDraft) => {
                setNewComboDraft(nextDraft);
                setSaveStatus(EMPTY_SAVE_STATUS);
              }}
              onPickBinding={() => setPickerContext({ type: "new-combo" })}
              captureActive={captureMode && captureContext?.type === "new-combo"}
              onCaptureBinding={() => {
                setCaptureContext({ type: "new-combo" });
                setCaptureMode(true);
                setCaptureStatus(null);
              }}
            />
          )}
          {editingKind === "macro" && selectedMacro && (
            <MacroDetailPanel
              macro={selectedMacro}
              draft={macroDraft}
              previewState={{ ...macroPreviewState, changed: macroDirty }}
              pendingCount={selectedMacroPendingCount}
              onAddDraft={addSelectedMacroDraft}
              onRemoveDraft={removeSelectedMacroDraft}
              onDraftChange={(nextDraft) => {
                setMacroDraft(nextDraft);
                setSaveStatus(EMPTY_SAVE_STATUS);
              }}
              onAddBindingRow={() => {
                setMacroDraft((current) => {
                  const bindings = macroDraftEntries(current.bindingDrafts);
                  return {
                    ...current,
                    fullBindingList: true,
                    bindingDrafts: Object.fromEntries([...bindings, "&kp A"].map((value, index) => [index, value])),
                  };
                });
                setSaveStatus(EMPTY_SAVE_STATUS);
              }}
              onRemoveBindingRow={(index) => {
                setMacroDraft((current) => {
                  const bindings = macroDraftEntries(current.bindingDrafts).filter((_, rowIndex) => rowIndex !== index);
                  return {
                    ...current,
                    fullBindingList: true,
                    bindingDrafts: Object.fromEntries(bindings.map((value, rowIndex) => [rowIndex, value])),
                  };
                });
                setSaveStatus(EMPTY_SAVE_STATUS);
              }}
              onPickBinding={(index) => setPickerContext({ type: "macro", index })}
              captureActiveIndex={captureMode && captureContext?.type === "macro" ? captureContext.index : null}
              onCaptureBinding={(index) => {
                setCaptureContext({ type: "macro", index });
                setCaptureMode(true);
                setCaptureStatus(null);
              }}
            />
          )}
          {editingKind === "macro" && isAddingMacro && (
            <NewMacroDetailPanel
              draft={newMacroDraft}
              previewState={newMacroPreviewState}
              pending={pendingChanges.some((change) => change.id === `macro-${newMacroDraft.nameRaw.trim()}-node-insert`)}
              onAddDraft={addNewMacroDraft}
              onRemoveDraft={removeNewMacroDraft}
              onDraftChange={(nextDraft) => {
                setNewMacroDraft(nextDraft);
                setSaveStatus(EMPTY_SAVE_STATUS);
              }}
              onPickBinding={() => setPickerContext({ type: "new-macro" })}
              captureActive={captureMode && captureContext?.type === "new-macro"}
              onCaptureBinding={() => {
                setCaptureContext({ type: "new-macro" });
                setCaptureMode(true);
                setCaptureStatus(null);
              }}
            />
          )}
          {editingKind === "binding" && (<>
          <div className={editorState.canEdit ? "editorBox" : "editorBox disabled"}>
            <div className="editorHeader">
              <strong>キーの割り当て</strong>
              <span>{editorState.canEdit ? "編集できます" : "編集非対応"}</span>
            </div>
            <label>
              <span>割り当てコード</span>
              <input
                aria-label="割り当てコード"
                aria-describedby={bindingDirty || !editorState.canEdit ? "binding-validation" : undefined}
                aria-invalid={bindingDirty && !keyInputValid}
                disabled={!editorState.canEdit}
                value={effectiveDraftBinding}
                onChange={(event) => {
                  setDraftBinding(event.target.value);
                  setCaptureStatus(null);
                  setSaveStatus(EMPTY_SAVE_STATUS);
                  setActiveTab("Preview");
                }}
              />
            </label>
            <div className="captureRow">
              <button
                type="button"
                disabled={!editorState.canEdit}
                className={captureMode ? "captureToggle active" : "captureToggle"}
                onClick={() => {
                  setCaptureContext({ type: "binding" });
                  setCaptureMode((prev) => !(prev && (captureContext?.type || "binding") === "binding"));
                  setCaptureStatus(null);
                }}
              >
                {captureMode ? "入力待ち（Escで終了）" : "実キーから入力"}
              </button>
              <button
                type="button"
                disabled={!editorState.canEdit}
                className="captureToggle"
                onClick={() => {
                  setCaptureMode(false);
                  setCaptureStatus(null);
                  setPickerContext({ type: "binding" });
                }}
              >
                キーを選ぶ
              </button>
              {captureMode && (
                <span className="captureHint">
                  {captureStatus || "キーを押して &kp を入力 / Esc で終了"}
                </span>
              )}
            </div>
            {(bindingDirty || !editorState.canEdit) && (
              <div id="binding-validation" className="editorStatus" role={bindingDirty && !keyInputValid ? "alert" : "status"}>
                {editorMessage(keyInputState && !keyInputState.valid ? keyInputState.message : editorState.message)}
              </div>
            )}
            <div className="editorActions">
              <button
                type="button"
                disabled={!keyInputValid || !bindingDirty}
                onClick={addSelectedDraft}
              >
                {selectedPendingChange ? "変更を更新" : "変更に追加"}
              </button>
              <button
                type="button"
                disabled={!selectedPendingChange && !bindingDirty}
                onClick={removeSelectedDraft}
              >
                変更を取り除く
              </button>
            </div>
            <button
              type="button"
              disabled={!saveEndpointAvailable || !keyInputValid || !editorState.changed || fileBusy}
              onClick={saveSelectedBinding}
            >
              {saveStatus.tone === "saving" ? "保存中…" : "このキーだけローカルへ保存"}
            </button>
          </div>
          <details className="technicalDetails"><summary>キーの詳細・ソース位置</summary>
          <dl className="detailList">
            <div>
              <dt>Display</dt>
              <dd>{selectedParsed.display}</dd>
            </div>
            <div>
              <dt>Binding</dt>
              <dd><code>{selectedBinding}</code></dd>
            </div>
            <div>
              <dt>Source range</dt>
              <dd>{selectedRange ? `${selectedRange.start}..${selectedRange.end}` : "Unavailable"}</dd>
            </div>
            <div>
              <dt>Kind</dt>
              <dd>{selectedParsed.kind}</dd>
            </div>
            <div>
              <dt>Editability</dt>
              <dd>{selectedParsed.editability}</dd>
            </div>
            <div>
              <dt>Notes</dt>
              <dd>{selectedParsed.note || "No special note."}</dd>
            </div>
          </dl>
          </details>
          </>)}
        </aside>
      </main>

      {pickerContext && (
        <KeycodePicker
          initialBinding={pickerInitialBinding}
          layerNames={layerNames}
          restrictTo={pickerContext.type === "sensor-inc" || pickerContext.type === "sensor-dec" ? ["&kp"] : null}
          initialCategory={pickerContext.initialCategory ?? ""}
          onDirtyChange={setPickerDirty}
          onSelect={(binding) => {
            if (pickerContext.type === "binding") {
              setDraftBinding(binding);
              setActiveTab("Preview");
            } else if (pickerContext.type === "combo") {
              setComboDraft((prev) => ({ ...prev, bindingRaw: binding }));
            } else if (pickerContext.type === "new-combo") {
              setNewComboDraft((prev) => ({ ...prev, bindingRaw: binding }));
            } else if (pickerContext.type === "macro") {
              setMacroDraft((prev) => ({
                ...prev,
                bindingDrafts: { ...prev.bindingDrafts, [pickerContext.index]: binding },
              }));
            } else if (pickerContext.type === "new-macro") {
              setNewMacroDraft((prev) => ({ ...prev, bindingsRaw: binding }));
            } else if (pickerContext.type === "sensor-inc" || pickerContext.type === "sensor-dec") {
              const keycode = binding.replace(/^&kp\s+/, "").trim();
              const field = pickerContext.type === "sensor-inc" ? "incKey" : "decKey";
              setSensorDrafts((prev) => ({
                ...prev,
                [pickerContext.layerIndex]: { ...sensorDrafts[pickerContext.layerIndex], [field]: keycode },
              }));
            }
            setSaveStatus(EMPTY_SAVE_STATUS);
            setPickerContext(null);
          }}
          onClose={() => setPickerContext(null)}
        />
      )}

      <section className="bottomPanel" id="viewer-sections" tabIndex={-1} inert={fileBusy}>
        <nav className="tabBar" aria-label="一覧と変更">
          {TABS.map((tab) => (
            <button type="button" aria-pressed={activeTab === tab} className={activeTab === tab ? "active" : ""} key={tab} onClick={() => {
              const kind = { Bindings: "binding", Combos: "combo", Macros: "macro" }[tab];
              if (kind && kind !== editingKind) {
                if (!leaveEditor()) return;
                setEditingKind(kind);
              }
              setActiveTab(tab);
              setPanelOpen(true);
            }}>
              {TAB_LABELS[tab]}
            </button>
          ))}
          <button type="button" aria-expanded={panelOpen} aria-controls="viewer-panel-content" onClick={() => setPanelOpen((open) => !open)}>{panelOpen ? "一覧を折りたたむ" : "一覧を開く"}</button>
          {activeTab === "Bindings" && (
            <input
              aria-label="キー一覧を検索"
              placeholder="割り当て・表示名で検索"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          )}
        </nav>
        <div id="viewer-panel-content" hidden={!panelOpen}>
        <PanelContent
          tab={activeTab}
          document={document}
          activeLayer={activeLayer}
          layerNames={layerNames}
          search={search}
          markdown={markdown}
          diagnostics={diagnostics}
          pendingChanges={pendingChanges}
          pendingState={pendingState}
          saveStatus={saveStatus}
          backups={keymapBackups}
          selectedPosition={selectedPosition}
          selectedComboName={selectedComboName}
          selectedMacroName={selectedMacroName}
          onSelectBinding={selectBinding}
          onSelectCombo={selectCombo}
          onNewCombo={startNewCombo}
          onSelectMacro={selectMacro}
          onNewMacro={startNewMacro}
          onRemovePendingChange={(id) => commitPendingChanges(removeDraftChange(pendingChanges, id))}
          onClearPendingChanges={clearPendingChanges}
          onSavePendingChanges={saveAllPendingChanges}
          onRefreshBackups={loadKeymapBackups}
          onRestoreBackup={restoreFromBackup}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={undo}
          onRedo={redo}
          saveEndpointAvailable={saveEndpointAvailable}
          trackballDraft={trackballDraft}
          trackballPendingCount={trackballPendingCount}
          onTrackballDraftChange={(next) => { setTrackballDraft(next); setSaveStatus(EMPTY_SAVE_STATUS); }}
          onAddTrackballDraft={addTrackballDraft}
          onRemoveTrackballDraft={removeTrackballDraft}
          sensorDrafts={sensorDrafts}
          sensorBaseline={sensorBaseline}
          trackballBaseline={trackballBaseline}
          sensorLayersWithBindings={sensorLayersWithBindings}
          sensorLayersWithoutBindings={sensorLayersWithoutBindings}
          selectedSensorLayerIndex={selectedSensorLayerIndex}
          sensorInsertLayerIndex={effectiveSensorInsertLayerIndex}
          sensorInsertBehavior={sensorInsertBehavior}
          onSelectSensorLayer={setSelectedSensorLayerIndex}
          onSelectSensorInsertLayer={setSensorInsertLayerIndex}
          onSelectSensorInsertBehavior={setSensorInsertBehavior}
          onSensorDraftChange={(layerIndex, field, value) => {
            setSensorDrafts((prev) => ({ ...prev, [layerIndex]: { ...sensorDrafts[layerIndex], [field]: value } }));
            setSaveStatus(EMPTY_SAVE_STATUS);
          }}
          onSensorPickInc={(layerIndex) => setPickerContext({
            type: "sensor-inc",
            layerIndex,
            initialCategory: sensorDrafts[layerIndex]?.behavior === "&inc_dec_cp" ? "Consumer" : undefined,
          })}
          onSensorPickDec={(layerIndex) => setPickerContext({
            type: "sensor-dec",
            layerIndex,
            initialCategory: sensorDrafts[layerIndex]?.behavior === "&inc_dec_cp" ? "Consumer" : undefined,
          })}
          onSensorSwap={(layerIndex) => {
            setSensorDrafts((prev) => {
              const d = sensorDrafts[layerIndex];
              if (!d) return prev;
              return { ...prev, [layerIndex]: { behavior: d.behavior, incKey: d.decKey, decKey: d.incKey } };
            });
            setSaveStatus(EMPTY_SAVE_STATUS);
          }}
          onAddSensorDraft={addSensorDraft}
          onRemoveSensorDraft={removeSensorDraft}
          onAddSensorLayerDraft={addSensorLayerDraft}
          onDeleteSensorBindingDraft={deleteSensorBindingDraft}
        />
        </div>
      </section>
    </div>
  );
}

function ComboDetailPanel({
  combo,
  draft,
  previewState,
  pendingCount,
  onAddDraft,
  onRemoveDraft,
  onDraftChange,
  onPickBinding,
  captureActive,
  onCaptureBinding,
}) {
  return (
    <section className="comboDetailPanel" aria-label="selected combo details">
      <div className="editorHeader">
        <strong>コンボ</strong>
        <span>{combo.name}</span>
      </div>

      <div className={previewState.changed ? "comboPreviewBox active" : "comboPreviewBox"}>
        <label>
          <span>割り当てコード</span>
          <div className="comboPickerRow">
            <input
              aria-label="Combo binding draft"
              disabled={!previewState.canEditBinding}
              value={draft.bindingRaw}
              onChange={(event) => onDraftChange({ ...draft, bindingRaw: event.target.value })}
            />
            <button
              type="button"
              disabled={!previewState.canEditBinding}
              className="pickerInlineBtn"
              onClick={onPickBinding}
            >
              キーを選ぶ
            </button>
            <button
              type="button"
              disabled={!previewState.canEditBinding}
              className={captureActive ? "pickerInlineBtn captureActive" : "pickerInlineBtn"}
              onClick={onCaptureBinding}
            >
              {captureActive ? "入力待ち（Escで終了）" : "実キーから入力"}
            </button>
          </div>
        </label>
        <label>
          <span>対象キー（図で選択・解除）</span>
          <input
            aria-label="Combo positions draft"
            value={draft.positionsRaw}
            onChange={(event) => onDraftChange({ ...draft, positionsRaw: event.target.value })}
          />
        </label>
        <label>
          <span>対象レイヤー番号</span>
          <input
            aria-label="Combo layers draft"
            placeholder="空欄はすべてのレイヤー"
            value={draft.layersRaw}
            onChange={(event) => onDraftChange({ ...draft, layersRaw: event.target.value })}
          />
        </label>
        <label>
          <span>判定時間 (ms)</span>
          <input
            aria-label="Combo timeout-ms draft"
            placeholder="空欄は既定値 50ms"
            value={draft.timeoutMsRaw}
            onChange={(event) => onDraftChange({ ...draft, timeoutMsRaw: event.target.value })}
          />
        </label>
        <div className="editorStatus" role={previewState.valid === false ? "alert" : "status"}>{editorMessage(previewState.message)}</div>
        <div className="editorActions">
          <button
            type="button"
            disabled={!previewState.changed || !previewState.valid}
            onClick={onAddDraft}
          >
            {pendingCount ? "変更を更新" : "変更に追加"}
          </button>
          <button
            type="button"
            disabled={!pendingCount && !previewState.changed}
            onClick={onRemoveDraft}
          >
            変更を取り除く
          </button>
        </div>
      </div>
      <details className="technicalDetails"><summary>詳細・ソース位置</summary>
      <dl className="detailList compactList">
        <div>
          <dt>Positions</dt>
          <dd>{combo.positions.join(" + ")}</dd>
        </div>
        <div>
          <dt>Binding</dt>
          <dd><code>{combo.binding}</code></dd>
        </div>
        <div>
          <dt>レイヤー</dt>
          <dd>{combo.layers.join(", ") || "all"}</dd>
        </div>
        <div>
          <dt>Timeout</dt>
          <dd>{combo.timeoutMs}ms</dd>
        </div>
        <div>
          <dt>Node range</dt>
          <dd>{formatRange(combo.sourceRange)}</dd>
        </div>
        <div>
          <dt>Positions range</dt>
          <dd>{formatRange(combo.keyPositionsRange)}</dd>
        </div>
        <div>
          <dt>Binding range</dt>
          <dd>{formatRange(combo.bindingEntry?.sourceRange)}</dd>
        </div>
      </dl>
      <pre className="rawNodePreview">{combo.raw}</pre>
      </details>
    </section>
  );
}

function NewComboDetailPanel({
  draft,
  previewState,
  pending,
  onAddDraft,
  onRemoveDraft,
  onDraftChange,
  onPickBinding,
  captureActive,
  onCaptureBinding,
}) {
  return (
    <section className="comboDetailPanel" aria-label="new combo details">
      <div className="editorHeader">
        <strong>コンボを作成</strong>
        <span>{draft.nameRaw || "unnamed"}</span>
      </div>
      <div className="comboPreviewBox active">
        <label>
          <span>Node name</span>
          <input
            aria-label="New combo node name"
            value={draft.nameRaw}
            onChange={(event) => onDraftChange({ ...draft, nameRaw: event.target.value })}
          />
        </label>
        <label>
          <span>Binding</span>
          <div className="comboPickerRow">
            <input
              aria-label="New combo binding"
              value={draft.bindingRaw}
              onChange={(event) => onDraftChange({ ...draft, bindingRaw: event.target.value })}
            />
            <button type="button" className="pickerInlineBtn" onClick={onPickBinding}>
              キーを選ぶ
            </button>
            <button
              type="button"
              className={captureActive ? "pickerInlineBtn captureActive" : "pickerInlineBtn"}
              onClick={onCaptureBinding}
            >
              {captureActive ? "入力待ち（Escで終了）" : "実キーから入力"}
            </button>
          </div>
        </label>
        <label>
          <span>対象キー（図で選択・解除）</span>
          <input
            aria-label="New combo positions"
            value={draft.positionsRaw}
            onChange={(event) => onDraftChange({ ...draft, positionsRaw: event.target.value })}
          />
        </label>
        <label>
          <span>レイヤー</span>
          <input
            aria-label="New combo layers"
            placeholder="空欄はすべてのレイヤー"
            value={draft.layersRaw}
            onChange={(event) => onDraftChange({ ...draft, layersRaw: event.target.value })}
          />
        </label>
        <label>
          <span>Timeout (ms)</span>
          <input
            aria-label="New combo timeout-ms"
            placeholder="空欄は既定値 50ms"
            value={draft.timeoutMsRaw}
            onChange={(event) => onDraftChange({ ...draft, timeoutMsRaw: event.target.value })}
          />
        </label>
        <div className="editorStatus" role={previewState.valid === false ? "alert" : "status"}>{editorMessage(previewState.message)}</div>
        <div className="editorActions">
          <button
            type="button"
            disabled={!previewState.changed || !previewState.valid}
            onClick={onAddDraft}
          >
            {pending ? "変更を更新" : "変更に追加"}
          </button>
          <button
            type="button"
            disabled={!pending}
            onClick={onRemoveDraft}
          >
            変更を取り除く
          </button>
        </div>
      </div>
      <details className="technicalDetails"><summary>生成するソースの詳細</summary>
      <pre className="rawNodePreview">{previewState.change?.nextRaw || "Fill in a valid new combo draft."}</pre>
      </details>
    </section>
  );
}

function LayerRenameRow({ currentName, draft, pending, disabled, onChange, onAdd, onRemove }) {
  const trimmed = (draft || "").trim();
  const validIdentifier = /^[A-Za-z_][A-Za-z0-9_-]*$/.test(trimmed);
  const changed = trimmed !== currentName;
  const canAdd = !disabled && validIdentifier && changed;
  const note = !disabled && trimmed && !validIdentifier
    ? "Invalid identifier."
    : "&lt N uses index, not name.";

  return (
    <div className="layerRenameRow">
      <input
        aria-label="Layer name draft"
        disabled={disabled}
        value={draft}
        placeholder="Layer name draft"
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="layerRenameActions">
        <button type="button" disabled={!canAdd} onClick={onAdd}>
          {pending ? "Update" : "Add"}
        </button>
        <button type="button" disabled={!pending && !changed} onClick={onRemove}>
          取り除く
        </button>
      </div>
      <small className="layerRenameNote">{note}</small>
    </div>
  );
}

function NewMacroDetailPanel({
  draft,
  previewState,
  pending,
  onAddDraft,
  onRemoveDraft,
  onDraftChange,
  onPickBinding,
  captureActive,
  onCaptureBinding,
}) {
  return (
    <section className="comboDetailPanel" aria-label="new macro details">
      <div className="editorHeader">
        <strong>マクロを作成</strong>
        <span>{draft.nameRaw || "unnamed"}</span>
      </div>
      <div className="comboPreviewBox active">
        <label>
          <span>Node name</span>
          <input
            aria-label="New macro node name"
            value={draft.nameRaw}
            onChange={(event) => onDraftChange({ ...draft, nameRaw: event.target.value })}
          />
        </label>
        <label>
          <span>Bindings</span>
          <div className="comboPickerRow">
            <input
              aria-label="New macro bindings"
              value={draft.bindingsRaw}
              onChange={(event) => onDraftChange({ ...draft, bindingsRaw: event.target.value })}
            />
            <button type="button" className="pickerInlineBtn" onClick={onPickBinding}>
              キーを選ぶ
            </button>
            <button
              type="button"
              className={captureActive ? "pickerInlineBtn captureActive" : "pickerInlineBtn"}
              onClick={onCaptureBinding}
            >
              {captureActive ? "入力待ち（Escで終了）" : "実キーから入力"}
            </button>
          </div>
        </label>
        <label>
          <span>wait-ms</span>
          <input
            aria-label="New macro wait-ms"
            placeholder="empty = no wait-ms property"
            value={draft.waitMsRaw}
            onChange={(event) => onDraftChange({ ...draft, waitMsRaw: event.target.value })}
          />
        </label>
        <label>
          <span>tap-ms</span>
          <input
            aria-label="New macro tap-ms"
            placeholder="empty = no tap-ms property"
            value={draft.tapMsRaw}
            onChange={(event) => onDraftChange({ ...draft, tapMsRaw: event.target.value })}
          />
        </label>
        <label>
          <span>Label</span>
          <input
            aria-label="New macro label"
            placeholder="optional"
            value={draft.labelRaw}
            onChange={(event) => onDraftChange({ ...draft, labelRaw: event.target.value })}
          />
        </label>
        <div className="editorStatus" role={previewState.valid === false ? "alert" : "status"}>{editorMessage(previewState.message)}</div>
        <div className="editorActions">
          <button
            type="button"
            disabled={!previewState.changed || !previewState.valid}
            onClick={onAddDraft}
          >
            {pending ? "変更を更新" : "変更に追加"}
          </button>
          <button
            type="button"
            disabled={!pending}
            onClick={onRemoveDraft}
          >
            変更を取り除く
          </button>
        </div>
      </div>
      <details className="technicalDetails"><summary>生成するソースの詳細</summary>
      <pre className="rawNodePreview">{previewState.change?.nextRaw || "Fill in a valid new macro draft."}</pre>
      </details>
    </section>
  );
}

function macroDraftEntries(bindingDrafts) {
  return Object.entries(bindingDrafts || {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, value]) => value);
}

function MacroDetailPanel({
  macro,
  draft,
  previewState,
  pendingCount,
  onAddDraft,
  onRemoveDraft,
  onDraftChange,
  onAddBindingRow,
  onRemoveBindingRow,
  onPickBinding,
  captureActiveIndex,
  onCaptureBinding,
}) {
  const editableSet = new Set(previewState.editableIndices || []);
  const bindingDrafts = draft.bindingDrafts || {};
  const bindingRows = macroDraftEntries(bindingDrafts);
  const existingCount = macro.bindingEntries?.length || 0;

  return (
    <section className="comboDetailPanel" aria-label="selected macro details">
      <div className="editorHeader">
        <strong>マクロ</strong>
        <span>{macro.name}</span>
      </div>

      <div className={previewState.changed ? "comboPreviewBox active" : "comboPreviewBox"}>
        {bindingRows.map((value, index) => {
          const editable = index >= existingCount || editableSet.has(index);
          const removable = editable && bindingRows.length > 1;
          const captureActive = captureActiveIndex === index;
          return (
            <label key={index}>
              <span>{`割り当て ${index}${editable ? "" : "（編集非対応）"}`}</span>
              <div className="comboPickerRow">
                <input
                  aria-label={`Macro binding ${index} draft`}
                  disabled={!editable}
                  value={value}
                  onChange={(event) => onDraftChange({
                    ...draft,
                    bindingDrafts: { ...bindingDrafts, [index]: event.target.value },
                  })}
                />
                <button
                  type="button"
                  disabled={!editable}
                  className="pickerInlineBtn"
                  onClick={() => onPickBinding(index)}
                >
                  キーを選ぶ
                </button>
                <button
                  type="button"
                  disabled={!editable}
                  className={captureActive ? "pickerInlineBtn captureActive" : "pickerInlineBtn"}
                  onClick={() => onCaptureBinding(index)}
                >
                  {captureActive ? "入力待ち（Escで終了）" : "実キーから入力"}
                </button>
                <button
                  type="button"
                  disabled={!removable}
                  className="pickerInlineBtn"
                  onClick={() => onRemoveBindingRow(index)}
                >
                  取り除く
                </button>
              </div>
            </label>
          );
        })}
        <button type="button" className="secondaryAction" onClick={onAddBindingRow}>
          割り当て行を追加
        </button>
        <label>
          <span>wait-ms draft</span>
          <input
            aria-label="Macro wait-ms draft"
            placeholder="empty = no wait-ms property"
            value={draft.waitMsRaw}
            onChange={(event) => onDraftChange({ ...draft, waitMsRaw: event.target.value })}
          />
        </label>
        <label>
          <span>tap-ms draft</span>
          <input
            aria-label="Macro tap-ms draft"
            placeholder="empty = no tap-ms property"
            value={draft.tapMsRaw}
            onChange={(event) => onDraftChange({ ...draft, tapMsRaw: event.target.value })}
          />
        </label>
        <div className="editorStatus" role={previewState.valid === false ? "alert" : "status"}>{editorMessage(previewState.message)}</div>
        <div className="editorActions">
          <button
            type="button"
            disabled={!previewState.changed || !previewState.valid}
            onClick={onAddDraft}
          >
            {pendingCount ? "変更を更新" : "変更に追加"}
          </button>
          <button
            type="button"
            disabled={!pendingCount && !previewState.changed}
            onClick={onRemoveDraft}
          >
            変更を取り除く
          </button>
        </div>
      </div>
      <details className="technicalDetails"><summary>詳細・ソース位置</summary>
      <dl className="detailList compactList">
        <div>
          <dt>Compatible</dt>
          <dd>{macro.compatible}</dd>
        </div>
        <div>
          <dt>Binding cells</dt>
          <dd>{macro.bindingCells}</dd>
        </div>
        <div>
          <dt>wait-ms</dt>
          <dd>{macro.waitMsRange ? `${macro.waitMs}ms` : "default"}</dd>
        </div>
        <div>
          <dt>tap-ms</dt>
          <dd>{macro.tapMsRange ? `${macro.tapMs}ms` : "default"}</dd>
        </div>
        <div>
          <dt>Node range</dt>
          <dd>{formatRange(macro.sourceRange)}</dd>
        </div>
        <div>
          <dt>Bindings range</dt>
          <dd>{formatRange(macro.bindingsRange)}</dd>
        </div>
      </dl>
      <pre className="rawNodePreview">{macro.raw}</pre>
      </details>
    </section>
  );
}

function KeyboardSvg({ keys, bindings, layerNames, changes, selectedPosition, highlightedPositions, savedOnlyPositions, onSelect, comboMode }) {
  const [focusedPosition, setFocusedPosition] = useState(selectedPosition);
  const keyRefs = useRef(new Map());
  useEffect(() => { setFocusedPosition(selectedPosition); }, [selectedPosition]);
  const moveFocus = (event, position) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = nextKeyPosition(keys, position, event.key);
    setFocusedPosition(next);
    keyRefs.current.get(next)?.focus();
  };
  const bounds = keys.reduce(
    (acc, key) => ({
      minX: Math.min(acc.minX, key.x),
      maxX: Math.max(acc.maxX, key.x),
      minY: Math.min(acc.minY, key.y),
      maxY: Math.max(acc.maxY, key.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
  const width = (bounds.maxX - bounds.minX) * UNIT + KEY_SIZE + 40;
  const height = (bounds.maxY - bounds.minY) * UNIT + KEY_SIZE + 44;
  const gapX = ((5.015 + 7.501) / 2) * UNIT;

  return (
    <svg className="keyboardSvg" viewBox={`-20 -20 ${width} ${height}`} role="group" aria-label="roBa キーボード図" aria-describedby="keyboard-help">
      <text className="halfLabel" x={2.5 * UNIT} y="0">LEFT</text>
      <text className="halfLabel" x={9.8 * UNIT} y="0">RIGHT</text>
      <line className="splitLine" x1={gapX} y1="6" x2={gapX} y2={(bounds.maxY + 1) * UNIT} />
      <circle
        className="trackball"
        cx={TRACKBALL.x * UNIT + KEY_SIZE / 2}
        cy={TRACKBALL.y * UNIT + KEY_SIZE / 2}
        r={TRACKBALL.r * UNIT}
      />
      <text className="trackballText" x={TRACKBALL.x * UNIT + KEY_SIZE / 2} y={TRACKBALL.y * UNIT + KEY_SIZE / 2 + 3}>trackball</text>
      {keys.map((key) => {
        const parsed = describeBinding(bindings[key.position], layerNames);
        return (
          <KeyCap
            key={key.position}
            keyDef={key}
            tabIndex={focusedPosition === key.position ? 0 : -1}
            keyRef={(node) => { if (node) keyRefs.current.set(key.position, node); else keyRefs.current.delete(key.position); }}
            onFocus={() => setFocusedPosition(key.position)}
            onNavigate={moveFocus}
            comboMode={comboMode}
            parsed={parsed}
            changes={changes.get(key.position)}
            selected={selectedPosition === key.position}
            highlighted={highlightedPositions.has(key.position)}
            savedOnly={savedOnlyPositions.has(key.position)}
            onSelect={onSelect}
          />
        );
      })}
    </svg>
  );
}

function KeyCap({ keyDef, parsed, changes, selected, highlighted, savedOnly, onSelect, tabIndex, keyRef, onFocus, onNavigate, comboMode }) {
  const x = keyDef.x * UNIT;
  const y = keyDef.y * UNIT;
  const rotate = keyDef.r ? ` rotate(${keyDef.r}, ${(keyDef.rx - keyDef.x) * UNIT}, ${(keyDef.ry - keyDef.y) * UNIT})` : "";
  const className = ["keyCap", changes ? "changedKey" : "", highlighted ? "comboHighlighted" : "", savedOnly ? "comboSavedOnly" : "", selected ? "selected" : "", keyDef.thumb ? "thumb" : "", parsed.kind].filter(Boolean).join(" ");

  return (
    <g ref={keyRef} role="button" tabIndex={tabIndex} onFocus={onFocus}
      aria-label={`キー ${keyDef.position}: ${parsed.display}${changes ? ` / 変更: ${changes.join(" / ")}` : ""}${comboMode ? " / コンボ対象を切り替え" : ""}`}
      aria-pressed={comboMode ? highlighted : selected}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (!event.repeat) onSelect(keyDef.position); }
        else onNavigate(event, keyDef.position);
      }} className={className} transform={`translate(${x}, ${y})${rotate}`} onClick={() => onSelect(keyDef.position)}>
      {changes && <title>{changes.join(" / ")}</title>}
      <rect width={KEY_SIZE} height={KEY_SIZE} rx="6" />
      <text className="keyDisplay" x={KEY_SIZE / 2} y="18">{shorten(parsed.display, 6)}</text>
      <text className="keyRaw" x={KEY_SIZE / 2} y="35">{parsed.behavior.replace("&", "") || parsed.kind}</text>
      {changes && <text className="keyChangeMark" x="4" y="10" aria-hidden="true">◆</text>}
      <text className="keyIndex" x={KEY_SIZE - 4} y={KEY_SIZE - 4}>{keyDef.position}</text>
    </g>
  );
}

function PanelContent({
  tab,
  document,
  activeLayer,
  layerNames,
  search,
  markdown,
  diagnostics,
  pendingChanges,
  pendingState,
  saveStatus,
  backups,
  selectedPosition,
  selectedComboName,
  selectedMacroName,
  onSelectBinding,
  onSelectCombo,
  onNewCombo,
  onSelectMacro,
  onNewMacro,
  onRemovePendingChange,
  onClearPendingChanges,
  onSavePendingChanges,
  onRefreshBackups,
  onRestoreBackup,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  saveEndpointAvailable,
  trackballDraft,
  trackballPendingCount,
  onTrackballDraftChange,
  onAddTrackballDraft,
  onRemoveTrackballDraft,
  sensorDrafts,
  sensorBaseline,
  trackballBaseline,
  sensorLayersWithBindings,
  sensorLayersWithoutBindings,
  selectedSensorLayerIndex,
  sensorInsertLayerIndex,
  onSelectSensorLayer,
  onSelectSensorInsertLayer,
  sensorInsertBehavior,
  onSelectSensorInsertBehavior,
  onSensorDraftChange,
  onSensorPickInc,
  onSensorPickDec,
  onSensorSwap,
  onAddSensorDraft,
  onRemoveSensorDraft,
  onAddSensorLayerDraft,
  onDeleteSensorBindingDraft,
}) {
  if (tab === "Bindings") {
    return (
      <BindingsTable
        document={document}
        activeLayer={activeLayer}
        layerNames={layerNames}
        search={search}
        selectedPosition={selectedPosition}
        onSelectBinding={onSelectBinding}
      />
    );
  }

  if (tab === "Combos") {
    return (
      <CombosTable
        combos={document.combos}
        selectedComboName={selectedComboName}
        onSelectCombo={onSelectCombo}
        onNewCombo={onNewCombo}
      />
    );
  }

  if (tab === "Macros") {
    return (
      <div className="tableSection">
        <div className="tableActions">
          <button type="button" onClick={onNewMacro}>マクロを作成</button>
        </div>
        <Table
          columns={["Name", "Compatible", "Binding cells", "Bindings"]}
          rows={document.macros}
          renderRow={(macro) => (
            <tr
              className={macro.name === selectedMacroName ? "selectedRow clickableRow" : "clickableRow"}
              key={macro.name}
              onClick={() => onSelectMacro(macro)}
            >
              <td><button type="button" className="rowSelect" aria-pressed={macro.name === selectedMacroName} onClick={(event) => { event.stopPropagation(); onSelectMacro(macro); }} aria-label={`マクロ ${macro.name} を選択`}>{macro.name}</button></td>
              <td>{macro.compatible}</td>
              <td>{macro.bindingCells}</td>
              <td><code>{macro.bindings.join(" ; ")}</code></td>
            </tr>
          )}
        />
      </div>
    );
  }

  if (tab === "Behaviors") {
    return (
      <Table
        columns={["Name", "Compatible", "Label", "Bindings"]}
        rows={document.behaviors}
        renderRow={(behavior) => (
          <tr key={behavior.name}>
            <td>{behavior.name}</td>
            <td>{behavior.compatible}</td>
            <td>{behavior.label}</td>
            <td><code>{behavior.bindings?.join(" ; ")}</code></td>
          </tr>
        )}
      />
    );
  }

  if (tab === "Sensors") {
    const selectedSensorLayer = sensorLayersWithBindings.find((l) => l.id === selectedSensorLayerIndex) ?? null;
    const sensorDraft = selectedSensorLayerIndex != null ? sensorDrafts[selectedSensorLayerIndex] : null;
    const sensorPendingId = selectedSensorLayerIndex != null ? `layer-${selectedSensorLayerIndex}-sensor-binding` : null;
    const sensorPending = pendingChanges.find((c) => c.id === sensorPendingId);
    const sensorChanged = sensorDraft && formChanged(sensorDraft, sensorBaseline[selectedSensorLayerIndex]);
    return (
      <div className="splitPanel">
        <div className="tableSection sensorTableSection">
          <Table
            columns={["Layer", "Inc", "Dec"]}
            rows={sensorLayersWithBindings}
            renderRow={(layer) => (
              <tr
                key={layer.id}
                className={layer.id === selectedSensorLayerIndex ? "selectedRow clickableRow" : "clickableRow"}
                onClick={() => onSelectSensorLayer(layer.id)}
              >
                <td><button type="button" className="rowSelect" onClick={(event) => { event.stopPropagation(); onSelectSensorLayer(layer.id); }}>{layer.name}</button></td>
                <td><code>{layer.sensorBindings[0]?.incKey}</code></td>
                <td><code>{layer.sensorBindings[0]?.decKey}</code></td>
              </tr>
            )}
          />
          <div className="sensorAddSection">
            <label className="fieldLabel" htmlFor="sensor-add-layer">Add sensor-binding</label>
            <div className="fieldRow">
              <select
                id="sensor-add-layer"
                value={sensorInsertLayerIndex}
                onChange={(event) => onSelectSensorInsertLayer(event.target.value)}
                disabled={!sensorLayersWithoutBindings.length}
              >
                {sensorLayersWithoutBindings.map((layer) => (
                  <option key={layer.id} value={layer.id}>{layer.name}</option>
                ))}
              </select>
              <select
                id="sensor-add-behavior"
                value={sensorInsertBehavior}
                onChange={(event) => onSelectSensorInsertBehavior(event.target.value)}
                disabled={!sensorLayersWithoutBindings.length}
                title="behavior"
              >
                <option value="&inc_dec_kp">kp (HID key)</option>
                <option value="&inc_dec_cp">cp (Consumer)</option>
              </select>
              <button type="button" disabled={!sensorLayersWithoutBindings.length} onClick={onAddSensorLayerDraft}>
                Add layer
              </button>
            </div>
          </div>
        </div>
        {selectedSensorLayer && sensorDraft ? (
          <SensorDetailPanel
            layer={selectedSensorLayer}
            draft={sensorDraft}
            pending={sensorPending}
            changed={sensorChanged}
            onBehaviorChange={(behavior) => onSensorDraftChange(selectedSensorLayerIndex, "behavior", behavior)}
            onPickInc={() => onSensorPickInc(selectedSensorLayerIndex)}
            onPickDec={() => onSensorPickDec(selectedSensorLayerIndex)}
            onSwap={() => onSensorSwap(selectedSensorLayerIndex)}
            onAddDraft={() => onAddSensorDraft(selectedSensorLayerIndex)}
            onRemoveDraft={() => onRemoveSensorDraft(selectedSensorLayerIndex)}
            onDeleteBinding={() => onDeleteSensorBindingDraft(selectedSensorLayerIndex)}
          />
        ) : (
          <div className="detailPlaceholder">← レイヤーを選択して編集</div>
        )}
      </div>
    );
  }

  if (tab === "Settings") {
    return (
      <TrackballSettingsPanel
        trackballSettings={document.trackballSettings}
        layerNames={layerNames}
        draft={trackballDraft}
        baseline={trackballBaseline}
        pendingCount={trackballPendingCount}
        onDraftChange={onTrackballDraftChange}
        onAddDraft={onAddTrackballDraft}
        onRemoveDraft={onRemoveTrackballDraft}
      />
    );
  }

  if (tab === "Markdown") {
    return <pre className="markdownPreview">{markdown}</pre>;
  }

  if (tab === "Preview") {
    return (
      <PreviewPanel
        pendingChanges={pendingChanges}
        pendingState={pendingState}
        saveStatus={saveStatus}
        backups={backups}
        onSelectBinding={onSelectBinding}
        onRemovePendingChange={onRemovePendingChange}
        onClearPendingChanges={onClearPendingChanges}
        onSavePendingChanges={onSavePendingChanges}
        onRefreshBackups={onRefreshBackups}
        onRestoreBackup={onRestoreBackup}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        saveEndpointAvailable={saveEndpointAvailable}
      />
    );
  }

  return (
    <div className="diagnosticsGrid">
      {diagnostics.map((item) => (
        <div className={`diagnostic ${item.ok ? "ok" : "fail"}`} key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <small>{item.ok ? "OK" : "Check needed"}</small>
        </div>
      ))}
    </div>
  );
}

function CombosTable({ combos, selectedComboName, onSelectCombo, onNewCombo }) {
  return (
    <div className="tableSection">
      <div className="tableActions">
        <button type="button" onClick={onNewCombo}>コンボを作成</button>
      </div>
      <Table
        columns={["Name", "Positions", "Binding", "Layers", "Timeout"]}
        rows={combos}
        renderRow={(combo) => (
          <tr
            className={combo.name === selectedComboName ? "selectedRow clickableRow" : "clickableRow"}
            key={combo.name}
            onClick={() => onSelectCombo(combo)}
          >
            <td><button type="button" className="rowSelect" aria-pressed={combo.name === selectedComboName} onClick={(event) => { event.stopPropagation(); onSelectCombo(combo); }} aria-label={`コンボ ${combo.name} を選択`}>{combo.name}</button></td>
            <td>{combo.positions.join(" + ")}</td>
            <td><code>{combo.binding}</code></td>
            <td>{combo.layers.join(", ") || "all"}</td>
            <td>{combo.timeoutMs}ms</td>
          </tr>
        )}
      />
    </div>
  );
}

function BindingsTable({ document, activeLayer, layerNames, search, selectedPosition, onSelectBinding }) {
  const rows = document.layers.flatMap((layer) =>
    layer.bindings.map((binding, position) => ({
      layer,
      position,
      binding,
      parsed: describeBinding(binding, layerNames),
    })),
  );
  const needle = search.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (!needle) return row.layer.id === activeLayer;
    return [row.layer.name, row.binding, row.parsed.display, row.parsed.kind, row.parsed.note].join(" ").toLowerCase().includes(needle);
  });


  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>{["Pos", "Layer", "Display", "Binding", "Kind", "Editability", "Notes"].map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {filtered.map((row) => {
            const selected = row.layer.id === activeLayer && row.position === selectedPosition;
            return (
              <tr
                className={selected ? "selectedRow" : ""}
                key={`${row.layer.id}-${row.position}`}
                onClick={() => onSelectBinding(row.layer.id, row.position)}
              >
                <td><button type="button" className="rowSelect" aria-pressed={selected} aria-label={`${row.layer.name} キー ${row.position}: ${row.parsed.display} を選択`} onClick={(event) => { event.stopPropagation(); onSelectBinding(row.layer.id, row.position); }}>{row.position}</button></td>
                <td>{row.layer.name}</td>
                <td><strong>{row.parsed.display}</strong></td>
                <td><code>{row.binding}</code></td>
                <td>{row.parsed.kind}</td>
                <td>{row.parsed.editability}</td>
                <td>{row.parsed.note}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PreviewPanel({
  pendingChanges,
  pendingState,
  saveStatus,
  backups,
  onSelectBinding,
  onRemovePendingChange,
  onClearPendingChanges,
  onSavePendingChanges,
  onRefreshBackups,
  onRestoreBackup,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  saveEndpointAvailable,
}) {
  const contextDiff = pendingState.contextDiff || pendingState.message;

  return (
    <div className={saveStatus.message ? "previewPanel hasStatus" : "previewPanel"}>
      <div className="diffGrid">
        <div>
          <div className="previewHeader">
            <h3>追加済みの変更</h3>
            <div className="previewActions">
              <button
                type="button"
                disabled={!saveEndpointAvailable || !pendingChanges.length || !pendingState.valid || saveStatus.tone === "saving"}
                onClick={onSavePendingChanges}
                title="追加済みの変更を保存（Ctrl+S）"
              >
                {saveStatus.tone === "saving" ? "保存中…" : "追加済みの変更をローカルへ保存"}
              </button>
              <button type="button" disabled={!pendingChanges.length} onClick={onClearPendingChanges}>変更をすべて取り除く</button>
              <button type="button" disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl+Z)">元に戻す</button>
              <button type="button" disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl+Shift+Z)">やり直す</button>
            </div>
          </div>
          <p className="keyboardHelp">Ctrl+S で一覧の変更を保存します。未追加の入力は編集欄に残ります。</p>
          <PendingChangesList
            changes={pendingChanges}
            message={pendingState.message}
            onSelect={onSelectBinding}
            onRemove={onRemovePendingChange}
          />
          <BackupRestorePanel
            backups={backups}
            saveEndpointAvailable={saveEndpointAvailable}
            restoreDisabled={saveStatus.tone === "saving"}
            onRefresh={onRefreshBackups}
            onRestore={onRestoreBackup}
          />
          <h3>変更差分</h3>
          <pre className="diffPreview">{editorMessage(contextDiff)}</pre>
        </div>
        <div>
          <h3>一括保存する内容</h3>
          {pendingState.valid
            ? <pre className="sourcePreview">{pendingState.nextSource}</pre>
            : <p>{editorMessage(pendingState.message)}</p>}
        </div>
      </div>
    </div>
  );
}

function PendingChangesList({ changes, message, onSelect, onRemove }) {
  if (!changes.length) {
    return <div className="pendingEmpty">{editorMessage(message)}</div>;
  }

  return (
    <div className="pendingList">
      {changes.map((change) => (
        <div className="pendingItem" key={change.id}>
          <button
            type="button"
            className="pendingMain"
            onClick={() => {
              if (change.kind === "binding" || !change.kind) onSelect(change.layerIndex, change.position);
            }}
          >
            <strong>{change.layerName || change.comboName || change.macroName || "Keymap"}</strong>
            <span>{change.position === undefined ? change.kind : `POS${change.position}`}</span>
            <code>{change.currentRaw} {"->"} {change.nextRaw}</code>
          </button>
          <button type="button" className="pendingRemove" onClick={() => onRemove(change.id)}>取り除く</button>
        </div>
      ))}
    </div>
  );
}

function BackupRestorePanel({
  backups,
  saveEndpointAvailable,
  restoreDisabled,
  onRefresh,
  onRestore,
}) {
  return (
    <section className="backupRestorePanel" aria-label="Keymap backups">
      <div className="backupRestoreHeader">
        <h3>Backups</h3>
        <button
          type="button"
          disabled={!saveEndpointAvailable}
          onClick={onRefresh}
          title="Refresh backup list"
        >
          Refresh
        </button>
      </div>
      {!saveEndpointAvailable && (
        <div className="backupEmpty">Backup restore is available only on the local dev server.</div>
      )}
      {saveEndpointAvailable && !backups.length && (
        <div className="backupEmpty">No backups yet. Save all creates the first backup.</div>
      )}
      {saveEndpointAvailable && backups.length > 0 && (
        <div className="backupList">
          {backups.map((backup) => (
            <div className="backupItem" key={backup.path}>
              <div className="backupMeta">
                <strong>{formatBackupName(backup.name)}</strong>
                <code>{backup.path}</code>
                <span>{formatBackupTime(backup.mtime)} · {formatBytes(backup.size)}</span>
              </div>
              <button
                type="button"
                disabled={restoreDisabled}
                onClick={() => onRestore(backup)}
                title="Restore this backup"
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SaveStatusPanel({ status, compact = false }) {
  const className = `${compact ? "saveStatus" : "previewSaveStatus"} ${status.tone}`;
  return (
    <div className={className} role={status.tone === "error" ? "alert" : "status"} aria-atomic="true" hidden={!status.message}>
      <strong>{status.title}</strong>
      <span>{status.message}</span>
      {(status.backupPath || status.drawerMessage) && (
        <details className="saveDetails">
          <summary>保存処理の詳細</summary>
          {status.backupPath && (
            <div className="backupPathBlock">
              <span className="backupPathLabel">バックアップの保存先</span>
              <code className="backupPathValue">{status.backupPath}</code>
            </div>
          )}
          {status.drawerMessage && (
            <div className="drawerStatusLine">
              <span className="drawerStatusLabel">keymap-drawer</span>
              <span>{status.drawerMessage}</span>
            </div>
          )}
        </details>
      )}
    </div>
  );
}

function formatBackupName(name) {
  return String(name || "").replace(/\.roBa\.keymap$/, "");
}

function formatBackupTime(mtime) {
  if (!mtime) return "mtime unavailable";
  return new Date(mtime).toLocaleString();
}

function formatBytes(size) {
  if (!Number.isFinite(size)) return "size unknown";
  if (size < 1024) return `${size} B`;
  return `${(size / 1024).toFixed(1)} KB`;
}

function Table({ columns, rows, renderRow }) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>{rows.map(renderRow)}</tbody>
      </table>
    </div>
  );
}

function StatusPill({ label, value, tone }) {
  return (
    <div className={`statusPill ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getStatusTone(status) {
  if (status.tone === "ok") return "ok";
  if (status.tone === "error") return "fail";
  if (status.tone === "saving") return "info";
  return "info";
}

function getDiagnostics(document) {
  const layerCountsOk = document.layers.every((layer) => layer.bindings.length === document.physicalLayout.length);
  const sensorBindingCount = document.layers.reduce((count, layer) => count + layer.sensorBindings.length, 0);
  return [
    { label: "config/roBa.json key count", value: document.physicalLayout.length, ok: document.physicalLayout.length === 43 },
    { label: "DTS physical layout key count", value: document.dtsPhysicalKeyCount, ok: document.dtsPhysicalKeyCount === 43 },
    { label: "Layer count", value: document.layers.length, ok: document.layers.length === 7 },
    { label: "Every layer binding count", value: layerCountsOk ? "43 each" : "mismatch", ok: layerCountsOk },
    { label: "Combo count", value: document.combos.length, ok: document.combos.length >= 5 },
    { label: "Macro count", value: document.macros.length, ok: document.macros.length >= 1 },
    { label: "Sensor binding count", value: sensorBindingCount, ok: sensorBindingCount === 2 },
  ];
}

function shorten(value, max) {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function SensorDetailPanel({ layer, draft, pending, changed, onBehaviorChange, onPickInc, onPickDec, onSwap, onAddDraft, onRemoveDraft, onDeleteBinding }) {
  const sb = layer.sensorBindings[0];
  const effectiveBehavior = draft.behavior || sb.behavior || "&inc_dec_kp";
  const previewRaw = `${effectiveBehavior} ${draft.incKey || "?"} ${draft.decKey || "?"}`;
  const pendingRemove = pending?.kind === "sensor-binding-remove";
  return (
    <section className="sensorDetailPanel" aria-label="sensor binding editor">
      <div className="editorHeader">
        <strong>{layer.name}</strong>
        <span className="eyebrow">sensor-binding</span>
      </div>
      <div className="fieldGroup">
        <span className="fieldLabel">Behavior</span>
        <div className="fieldRow">
          <select
            value={effectiveBehavior}
            onChange={(event) => onBehaviorChange(event.target.value)}
          >
            <option value="&inc_dec_kp">kp (HID key)</option>
            <option value="&inc_dec_cp">cp (Consumer)</option>
          </select>
        </div>
      </div>
      <div className="fieldGroup">
        <span className="fieldLabel">Inc (時計回り)</span>
        <div className="fieldRow">
          <code className="fieldValue">{draft.incKey || "(未設定)"}</code>
          <button type="button" onClick={onPickInc}>キーを選ぶ</button>
        </div>
      </div>
      <div className="fieldGroup">
        <span className="fieldLabel">Dec (反時計回り)</span>
        <div className="fieldRow">
          <code className="fieldValue">{draft.decKey || "(未設定)"}</code>
          <button type="button" onClick={onPickDec}>キーを選ぶ</button>
        </div>
      </div>
      <div className="fieldGroup">
        <button type="button" onClick={onSwap} title="inc と dec を入れ替え">⇄ Swap inc/dec</button>
      </div>
      <div className="comboPreviewBox">
        <span className="fieldLabel">Preview</span>
        <code>{previewRaw}</code>
        {pending && <span className="pendingBadge">draft</span>}
      </div>
      <p className="trackballDisabledHint">
        全レイヤー方向反転は <code>boards/shields/roBa/roBa.overlay</code> の編集が必要です。
      </p>
      <div className="editorActions">
        <button type="button" disabled={!changed && !pending} onClick={onAddDraft}>
          {pending ? "変更を更新" : "変更に追加"}
        </button>
        <button type="button" disabled={!pending && !changed} onClick={onRemoveDraft}>
          変更を取り除く
        </button>
        <button type="button" disabled={pendingRemove} onClick={onDeleteBinding}>
          Remove sensor-binding
        </button>
      </div>
      <div className="fieldLabel">保存済み: <code>{sb.raw}</code></div>
    </section>
  );
}

function TrackballSettingsPanel({
  trackballSettings,
  layerNames,
  draft,
  baseline,
  pendingCount,
  onDraftChange,
  onAddDraft,
  onRemoveDraft,
}) {
  if (!trackballSettings) {
    return (
      <div className="tableSection">
        <div className="editorHeader"><strong>Settings</strong></div>
        <div className="pendingEmpty">Trackball settings are not available in this keymap.</div>
      </div>
    );
  }

  const { automouseLayer, scrollLayers } = trackballSettings;
  const layerCount = layerNames.length;

  const automouseOptions = Array.from({ length: layerCount }, (_, index) => ({
    index,
    name: layerNames[index] || `layer_${index}`,
    disabled: index === 0,
  }));

  const currentScrollSet = new Set(
    String(draft.scrollLayersRaw || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(Number)
      .filter((n) => Number.isInteger(n)),
  );

  const toggleScrollLayer = (index) => {
    const next = new Set(currentScrollSet);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    const sorted = [...next].sort((a, b) => a - b).join(" ");
    onDraftChange({ ...draft, scrollLayersRaw: sorted });
  };

  const currentAutomouseRaw = baseline.automouseLayerRaw;
  const currentScrollRaw = baseline.scrollLayersRaw;
  const automouseChanged = draft.automouseLayerRaw !== currentAutomouseRaw;
  const scrollChanged = draft.scrollLayersRaw !== currentScrollRaw;
  const anyChanged = automouseChanged || scrollChanged;

  return (
    <div className="tableSection">
      <div className="editorHeader"><strong>Settings</strong><span>Trackball</span></div>
      <div className="trackballSettingsScroll">
        {!automouseLayer && (
          <div className="pendingEmpty">automouse-layer property not found (read-only).</div>
        )}
        {automouseLayer && (
          <div className="comboPreviewBox active">
            <label>
              <span>
                automouse-layer
                {Number(draft.automouseLayerRaw) === 0 && (
                  <span className="trackballDisabledHint"> — automouse disabled (value 0)</span>
                )}
              </span>
              <select
                aria-label="automouse-layer"
                value={draft.automouseLayerRaw}
                onChange={(event) => onDraftChange({ ...draft, automouseLayerRaw: event.target.value })}
              >
                {automouseOptions.map(({ index, name }) => (
                  <option key={index} value={String(index)}>
                    {index}: {name}{index === 0 ? " (disabled)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {!scrollLayers && (
          <div className="pendingEmpty">scroll-layers property not found (read-only).</div>
        )}
        {scrollLayers && (
          <div className="comboPreviewBox active">
            <span className="fieldLabel">scroll-layers</span>
            <div className="scrollLayerCheckboxList" role="group" aria-label="scroll-layers">
              {Array.from({ length: layerCount }, (_, index) => (
                <label key={index} className="scrollLayerCheckbox">
                  <input
                    type="checkbox"
                    checked={currentScrollSet.has(index)}
                    onChange={() => toggleScrollLayer(index)}
                  />
                  {index}: {layerNames[index] || `layer_${index}`}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="editorActions">
          <button
            type="button"
            disabled={!anyChanged}
            onClick={onAddDraft}
          >
            {pendingCount ? "Update trackball draft" : "Add trackball draft"}
          </button>
          <button
            type="button"
            disabled={!pendingCount && !anyChanged}
            onClick={onRemoveDraft}
          >
            Remove trackball draft
          </button>
        </div>
      </div>
    </div>
  );
}

function formatRange(range) {
  return range ? `${range.start}..${range.end}` : "Unavailable";
}

function KeycodePicker({ initialBinding = "", layerNames = [], onSelect, onClose, onDirtyChange, restrictTo = null, initialCategory = "" }) {
  const initialDraft = useMemo(
    () => parseStructuredBinding(initialBinding, layerNames.length),
    [initialBinding, layerNames.length],
  );
  const [draft, setDraft] = useState(initialDraft);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const searchRef = useRef(null);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  useEffect(() => {
    onDirtyChange(formChanged(draft, initialDraft));
    return () => onDirtyChange(false);
  }, [draft, initialDraft, onDirtyChange]);
  useEffect(() => {
    const opener = document.activeElement;
    const dialog = dialogRef.current;
    dialog.showModal();
    (searchRef.current || closeRef.current)?.focus();
    return () => {
      dialog.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  const handleDialogKeyDown = (event) => {
    // 保存/Undo と実キー入力が背景の編集状態に届かないようにする。
    event.stopPropagation();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") event.preventDefault();
    if (event.key !== "Tab") return;
    const elements = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')]
      .filter((element) => element.getClientRects().length > 0);
    const target = focusWrapTarget(elements, document.activeElement, event.shiftKey);
    if (target) { event.preventDefault(); target.focus(); }
  };

  const results = searchCatalog(search, category);
  const structuredState = validateStructuredBinding(draft, layerNames.length);

  const chooseKeycode = (keycode) => {
    const nextDraft = { ...draft, keycode };
    const nextState = validateStructuredBinding(nextDraft, layerNames.length);
    if (nextState.ok) onSelect(nextState.binding);
    else setDraft(nextDraft);
  };

  const toggleKeypressModifier = (code) => {
    setDraft((prev) => {
      const selected = new Set(prev.keypressModifiers || []);
      if (selected.has(code)) selected.delete(code);
      else selected.add(code);
      return { ...prev, keypressModifiers: [...selected] };
    });
  };

  return (
    <dialog ref={dialogRef} className="pickerDialog" aria-label="キーを選ぶ" aria-modal="true"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={handleDialogKeyDown}
      onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}
    >
        <div className="pickerHeader">
          <strong>キーを選ぶ</strong>
          <button type="button" ref={closeRef} className="pickerClose" onClick={onClose} aria-label="閉じる">✕</button>
        </div>
        <div className="structuredPicker">
          <div className="behaviorPicker" role="group" aria-label="Behavior">
            {STRUCTURED_BEHAVIORS.filter((b) => !restrictTo || restrictTo.includes(b)).map((behavior) => {
              const label = STRUCTURED_BEHAVIOR_LABELS[behavior];
              return (
                <button
                  type="button"
                  key={behavior}
                  className={draft.behavior === behavior ? "active" : ""}
                  onClick={() => setDraft((prev) => ({ ...prev, behavior }))}
                  title={label.long}
                  aria-label={BEHAVIOR_LABELS_JA[behavior]}
                >
                  {label.short} · {BEHAVIOR_LABELS_JA[behavior]}
                </button>
              );
            })}
          </div>
          {draft.behavior === "&lt" && (
            <label>
              <span>長押し時のレイヤー</span>
              <select
                value={draft.layerIndex}
                onChange={(event) => setDraft((prev) => ({ ...prev, layerIndex: Number(event.target.value) }))}
              >
                {layerNames.map((name, index) => (
                  <option key={index} value={index}>{index}: {name}</option>
                ))}
              </select>
            </label>
          )}
          {draft.behavior === "&mt" && (
            <label>
              <span>長押し時の修飾キー</span>
              <select
                value={draft.modifier}
                onChange={(event) => setDraft((prev) => ({ ...prev, modifier: event.target.value }))}
              >
                {HOLD_TAP_MODIFIERS.map((modifier) => (
                  <option key={modifier.code} value={modifier.code}>{modifier.label}</option>
                ))}
              </select>
            </label>
          )}
          {draft.behavior === "&mkp" && (
            <label>
              <span>Mouse button</span>
              <select
                value={draft.mouseButton ?? "MB1"}
                onChange={(event) => setDraft((prev) => ({ ...prev, mouseButton: event.target.value }))}
              >
                {MOUSE_BUTTONS.map((btn) => (
                  <option key={btn.code} value={btn.code}>{btn.label}</option>
                ))}
              </select>
            </label>
          )}
          {draft.behavior === "&bt" && (
            <label>
              <span>BT command</span>
              <select
                value={draft.btCommand ?? BT_COMMANDS[0].id}
                onChange={(event) => setDraft((prev) => ({ ...prev, btCommand: event.target.value }))}
              >
                {BT_COMMANDS.map((cmd) => (
                  <option key={cmd.id} value={cmd.id}>{cmd.label}</option>
                ))}
              </select>
            </label>
          )}
          {draft.behavior !== "&mkp" && draft.behavior !== "&bt" && draft.behavior !== "&bootloader" && (
            <>
              <label>
                <span>短押し時のキー</span>
                <input
                  value={draft.keycode}
                  onChange={(event) => setDraft((prev) => ({ ...prev, keycode: event.target.value }))}
                  aria-label="Structured picker keycode"
                />
              </label>
              <div className="keypressModifierGroup" role="group" aria-label="Tap keycode modifiers">
                {KEY_PRESS_MODIFIERS.map((modifier) => {
                  const active = (draft.keypressModifiers || []).includes(modifier.code);
                  return (
                    <button
                      type="button"
                      key={modifier.code}
                      className={active ? "active" : ""}
                      aria-pressed={active}
                      onClick={() => toggleKeypressModifier(modifier.code)}
                    >
                      {modifier.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <div className="structuredPreview">
            <code>{structuredState.ok ? structuredState.binding : structuredState.message}</code>
            <button
              type="button"
              disabled={!structuredState.ok}
              onClick={() => onSelect(buildStructuredBinding(draft, layerNames.length))}
            >
              この割り当てを使う
            </button>
          </div>
        </div>
        {draft.behavior !== "&mkp" && draft.behavior !== "&bt" && draft.behavior !== "&bootloader" && (
          <>
            <input
              ref={searchRef}
              className="pickerSearch"
              placeholder="キーコード・名前で検索…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="キーを検索"
            />
            <div className="pickerCategories">
              <button type="button" className={!category ? "active" : ""} onClick={() => setCategory("")}>
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  className={category === cat ? "active" : ""}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="pickerList">
              {results.map((item) => (
                <button
                  type="button"
                  key={item.code}
                  className="pickerItem"
                  onClick={() => chooseKeycode(item.code)}
                >
                  <span className="pickerItemLabel">{item.label}</span>
                  <code className="pickerItemCode">{item.code}</code>
                  {item.note && <span className="pickerItemNote">{item.note}</span>}
                </button>
              ))}
              {results.length === 0 && (
                <div className="pickerEmpty">一致するキーがありません。</div>
              )}
            </div>
          </>
        )}
    </dialog>
  );
}

export default App;
