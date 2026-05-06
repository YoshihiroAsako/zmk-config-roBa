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
  HOLD_TAP_MODIFIERS,
  KEY_PRESS_MODIFIERS,
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
  buildPendingChangesState,
  getDraftId,
  removeDraftChange,
  upsertDraftChange,
  upsertDraftChanges,
} from "./keymap/pendingChanges.js";

const KEY_SIZE = 44;
const UNIT = 48;
const TRACKBALL = { x: 10, y: 3.8, r: 0.62 };

const TABS = ["Bindings", "Combos", "Macros", "Behaviors", "Sensors", "Preview", "Markdown", "Diagnostics"];
const EMPTY_SAVE_STATUS = { tone: "idle", title: "", message: "", backupPath: "", drawerMessage: "" };

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
  const [activeTab, setActiveTab] = useState("Bindings");
  const [search, setSearch] = useState("");
  const [draftBinding, setDraftBinding] = useState(null);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const shortcutsRef = useRef(null);
  const [selectedComboName, setSelectedComboName] = useState("");
  const [comboDraft, setComboDraft] = useState({
    bindingRaw: "",
    positionsRaw: "",
    layersRaw: "",
    timeoutMsRaw: "",
  });
  const [isAddingCombo, setIsAddingCombo] = useState(false);
  const [newComboDraft, setNewComboDraft] = useState(() => createEmptyComboDraft([]));
  const [selectedMacroName, setSelectedMacroName] = useState("");
  const [macroDraft, setMacroDraft] = useState({
    bindingDrafts: {},
    fullBindingList: true,
    waitMsRaw: "",
    tapMsRaw: "",
  });
  const [isAddingMacro, setIsAddingMacro] = useState(false);
  const [newMacroDraft, setNewMacroDraft] = useState(() => createEmptyMacroDraft([]));
  const [layerRenameDraft, setLayerRenameDraft] = useState("");
  const [captureMode, setCaptureMode] = useState(false);
  const [captureStatus, setCaptureStatus] = useState(null);
  const [captureContext, setCaptureContext] = useState({ type: "binding" });
  const [pickerContext, setPickerContext] = useState(null);
  const [keymapMtime, setKeymapMtime] = useState(null);
  const [keymapBackups, setKeymapBackups] = useState([]);

  const layerNames = document.layers.map((layer) => layer.name);
  const currentLayer = document.layers[activeLayer] || document.layers[0];
  const selectedCombo = isAddingCombo ? null : document.combos.find((combo) => combo.name === selectedComboName);
  const activeComboPositionsRaw = isAddingCombo ? newComboDraft.positionsRaw : comboDraft.positionsRaw;
  const comboDraftPositionSet = activeTab === "Combos" && (selectedCombo || isAddingCombo)
    ? new Set(activeComboPositionsRaw.trim().split(/\s+/).filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n >= 0))
    : new Set();
  const comboHighlightPositions = comboDraftPositionSet;
  const comboSavedOnlyPositions = activeTab === "Combos" && selectedCombo
    ? new Set(selectedCombo.positions.filter((p) => !comboDraftPositionSet.has(p)))
    : new Set();
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
  const effectiveDraftBinding = draftBinding ?? selectedPendingChange?.nextRaw ?? selectedEntry?.raw ?? selectedBinding;
  const editorState = useMemo(
    () => buildEditorState(keymapSource, selectedEntry, effectiveDraftBinding, document.layers),
    [selectedEntry, effectiveDraftBinding, document],
  );
  const pendingState = useMemo(
    () => buildPendingChangesState(keymapSource, pendingChanges, document.layers, { keyCount: document.physicalLayout.length }),
    [keymapSource, pendingChanges, document.layers, document.physicalLayout.length],
  );
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
      document.combos,
      document.physicalLayout.length,
      document.layers.length,
    ),
    [keymapSource, newComboDraft, document.combos, document.physicalLayout.length, document.layers.length],
  );
  const macroPreviewState = useMemo(
    () => buildMacroPreviewState(keymapSource, selectedMacro, macroDraft),
    [keymapSource, selectedMacro, macroDraft],
  );
  const newMacroPreviewState = useMemo(
    () => buildNewMacroPreviewState(keymapSource, newMacroDraft, document.macros),
    [keymapSource, newMacroDraft, document.macros],
  );
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
    fetch("/__roba/keymap-source")
      .then((r) => r.json())
      .then((payload) => { if (payload.ok) setKeymapMtime(payload.mtime ?? null); })
      .catch(() => {});
    loadKeymapBackups();
  }, []);

  useEffect(() => {
    setDraftBinding(selectedPendingChange?.nextRaw || selectedEntry?.raw || selectedBinding);
    setCaptureStatus(null);
  }, [selectedEntry, selectedBinding, selectedPendingChange]);

  useEffect(() => {
    setComboDraft({
      bindingRaw: selectedCombo?.binding || "",
      positionsRaw: selectedCombo?.positions.join(" ") || "",
      layersRaw: selectedCombo?.layers.join(" ") || "",
      timeoutMsRaw: selectedCombo?.timeoutMsRange ? String(selectedCombo.timeoutMs) : "",
    });
  }, [selectedCombo]);

  useEffect(() => {
    if (!isAddingCombo) {
      setNewComboDraft((current) => ({
        ...createEmptyComboDraft(document.combos),
        bindingRaw: current.bindingRaw || "&kp A",
      }));
    }
  }, [document.combos, isAddingCombo]);

  useEffect(() => {
    setMacroDraft({
      bindingDrafts: Object.fromEntries(
        (selectedMacro?.bindingEntries || []).map((entry, index) => [index, entry.raw]),
      ),
      fullBindingList: true,
      waitMsRaw: selectedMacro?.waitMsRange ? String(selectedMacro.waitMs) : "",
      tapMsRaw: selectedMacro?.tapMsRange ? String(selectedMacro.tapMs) : "",
    });
  }, [selectedMacro]);

  useEffect(() => {
    if (!isAddingMacro) {
      setNewMacroDraft((current) => ({
        ...createEmptyMacroDraft(document.macros),
        bindingsRaw: current.bindingsRaw || "&kp A",
      }));
    }
  }, [document.macros, isAddingMacro]);

  useEffect(() => {
    if (!captureMode) return;

    const handleKeyDown = (event) => {
      const result = captureKeyToBinding({
        code: event.code,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        repeat: event.repeat,
        isComposing: event.isComposing,
      });

      if (result.cancelled) {
        event.preventDefault();
        setCaptureMode(false);
        setCaptureStatus(null);
        return;
      }

      if (result.ignored) return;

      if (result.unsupported) {
        setCaptureStatus(`未対応: ${result.reason} → Pick keycode で選択できます`);
        return;
      }

      // supported binding
      event.preventDefault();
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

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [captureMode, captureContext, editorState.canEdit]);

  const layerRenameDraftId = `layer-${activeLayer}-rename`;
  const layerRenamePending = pendingChanges.find((change) => change.id === layerRenameDraftId);
  useEffect(() => {
    setLayerRenameDraft(layerRenamePending?.nextRaw ?? currentLayer.name);
  }, [activeLayer, currentLayer.name, layerRenamePending?.nextRaw]);

  const reloadKeymapSource = async () => {
    if (!saveEndpointAvailable) {
      setSaveStatus({
        tone: "error",
        title: "Reload unavailable",
        message: "Reload is available only on the local dev server.",
        backupPath: "",
      });
      return;
    }

    setSaveStatus({
      tone: "saving",
      title: "Reloading source",
      message: "Loading the latest config/roBa.keymap from disk.",
      backupPath: "",
    });
    try {
      const response = await fetch("/__roba/keymap-source");
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Reload failed.");
      }

      setKeymapSource(payload.source);
      setKeymapMtime(payload.mtime ?? null);
      setDraftBinding(null);
      setPendingChanges([]);
      setIsAddingCombo(false);
      setIsAddingMacro(false);
      setSaveStatus({
        tone: "ok",
        title: "Reloaded source",
        message: "Loaded the latest config/roBa.keymap from disk.",
        backupPath: "",
      });
      loadKeymapBackups();
    } catch (error) {
      setSaveStatus({
        tone: "error",
        title: "Reload failed",
        message: error.message,
        backupPath: "",
      });
    }
  };

  const saveSelectedBinding = async () => {
    if (!editorState.canEdit || !editorState.changed || !selectedEntry?.sourceRange) return;
    if (!saveEndpointAvailable) {
      setSaveStatus({
        tone: "error",
        title: "Save unavailable",
        message: "Save is available only on the local dev server.",
        backupPath: "",
      });
      return;
    }

    setSaveStatus({
      tone: "saving",
      title: "Saving .keymap",
      message: "Validating source and creating a backup.",
      backupPath: "",
    });
    try {
      const response = await fetch("/__roba/save-binding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePath: "config/roBa.keymap",
          range: selectedEntry.sourceRange,
          currentRaw: selectedEntry.raw,
          nextRaw: effectiveDraftBinding,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Save failed.");
      }

      setKeymapSource(payload.source);
      setDraftBinding(effectiveDraftBinding);
      setPendingChanges([]);
      setSaveStatus({
        tone: "ok",
        title: "Saved .keymap",
        message: "Backup created before writing config/roBa.keymap.",
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
        title: "Save failed",
        message: error.message,
        backupPath: "",
        drawerMessage: "",
      });
    }
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

  const saveAllPendingChanges = async ({ forceMtime = false, forceDrawer = false } = {}) => {
    if (!pendingChanges.length || !pendingState.valid) return;
    if (!saveEndpointAvailable) {
      setSaveStatus({
        tone: "error",
        title: "Save unavailable",
        message: "Save all is available only on the local dev server.",
        backupPath: "",
      });
      return;
    }

    setSaveStatus({
      tone: "saving",
      title: "Saving pending changes",
      message: "Validating all draft changes and creating one backup.",
      backupPath: "",
    });
    try {
      const response = await fetch("/__roba/save-bindings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePath: "config/roBa.keymap",
          changes: pendingChanges.map((change) => ({
            kind: change.kind,
            macroName: change.macroName,
            range: change.range,
            currentRaw: change.currentRaw,
            nextRaw: change.nextRaw,
          })),
          expectedMtime: keymapMtime,
          forceMtime,
          forceDrawer,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        if (payload.error === "FILE_CHANGED") {
          setSaveStatus(EMPTY_SAVE_STATUS);
          const confirmed = window.confirm(
            "config/roBa.keymap がロード後に外部で変更されています。\n\n上書きして保存しますか？",
          );
          if (confirmed) saveAllPendingChanges({ forceMtime: true, forceDrawer });
          return;
        }
        if (payload.error === "DRAWER_DIRTY") {
          setSaveStatus(EMPTY_SAVE_STATUS);
          const confirmed = window.confirm(
            `keymap-drawer ファイルに未コミットの変更があります:\n  ${payload.paths.join("\n  ")}\n\nSave all 後の自動更新で上書きされる可能性があります。続行しますか？`,
          );
          if (confirmed) saveAllPendingChanges({ forceMtime, forceDrawer: true });
          return;
        }
        throw new Error(payload.message || "Save all failed.");
      }

      setKeymapSource(payload.source);
      setKeymapMtime(payload.mtime ?? null);
      setDraftBinding(null);
      setPendingChanges([]);
      setIsAddingCombo(false);
      setIsAddingMacro(false);
      setSaveStatus({
        tone: "ok",
        title: "Saved pending changes",
        message: payload.message || "Backup created before writing config/roBa.keymap.",
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
        title: "Save all failed",
        message: error.message,
        backupPath: "",
        drawerMessage: "",
      });
    }
  };

  const restoreFromBackup = async (backup) => {
    if (!saveEndpointAvailable) {
      setSaveStatus({
        tone: "error",
        title: "Restore unavailable",
        message: "Backup restore is available only on the local dev server.",
        backupPath: "",
        drawerMessage: "",
      });
      return;
    }

    const pendingNote = pendingChanges.length
      ? `\n\n${pendingChanges.length} pending change(s) will be cleared.`
      : "";
    const confirmed = window.confirm(
      `Restore config/roBa.keymap from this backup?\n\n${backup.path}${pendingNote}`,
    );
    if (!confirmed) return;

    setSaveStatus({
      tone: "saving",
      title: "Restoring backup",
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

      setKeymapSource(payload.source);
      setKeymapMtime(payload.mtime ?? null);
      setDraftBinding(null);
      setPendingChanges([]);
      setUndoStack([]);
      setRedoStack([]);
      setIsAddingCombo(false);
      setIsAddingMacro(false);
      setSaveStatus({
        tone: "ok",
        title: "Restored backup",
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
        title: "Restore failed",
        message: error.message,
        backupPath: "",
        drawerMessage: "",
      });
    }
  };

  const selectBinding = (layerId, position) => {
    setActiveLayer(layerId);
    setSelectedPosition(position);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const selectCombo = (combo) => {
    setIsAddingCombo(false);
    setSelectedComboName(combo.name);
    if (combo.layers.length) setActiveLayer(combo.layers[0]);
    if (combo.positions.length) setSelectedPosition(combo.positions[0]);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const startNewCombo = () => {
    setIsAddingCombo(true);
    setSelectedComboName("");
    setNewComboDraft(createEmptyComboDraft(document.combos));
    setActiveTab("Combos");
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const commitPendingChanges = (newChanges) => {
    setUndoStack((prev) => [...prev.slice(-49), pendingChanges]);
    setRedoStack([]);
    setPendingChanges(newChanges);
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    setRedoStack((prev) => [...prev, pendingChanges]);
    setUndoStack((prev) => prev.slice(0, -1));
    setPendingChanges(undoStack[undoStack.length - 1]);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    setUndoStack((prev) => [...prev, pendingChanges]);
    setRedoStack((prev) => prev.slice(0, -1));
    setPendingChanges(redoStack[redoStack.length - 1]);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  shortcutsRef.current = { undo, redo, saveAllPendingChanges };

  useEffect(() => {
    const handleKeyDown = (e) => {
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
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        shortcutsRef.current?.saveAllPendingChanges();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const addSelectedDraft = () => {
    if (!editorState.canEdit || !selectedEntry?.sourceRange) return;
    const change = buildDraftChange({
      layerIndex: activeLayer,
      layerName: currentLayer.name,
      position: selectedPosition,
      entry: selectedEntry,
      nextRaw: effectiveDraftBinding,
    });
    commitPendingChanges(upsertDraftChange(pendingChanges, change));
    setSaveStatus(EMPTY_SAVE_STATUS);
    setActiveTab("Preview");
  };

  const removeSelectedDraft = () => {
    commitPendingChanges(removeDraftChange(pendingChanges, selectedDraftId));
    setDraftBinding(selectedEntry?.raw || selectedBinding);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const clearPendingChanges = () => {
    commitPendingChanges([]);
    setDraftBinding(selectedEntry?.raw || selectedBinding);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const addLayerRenameDraft = () => {
    const trimmed = layerRenameDraft.trim();
    if (!currentLayer.nameRange || !trimmed || trimmed === currentLayer.name) return;
    const change = buildLayerRenameDraftChange({
      layerIndex: activeLayer,
      currentName: currentLayer.name,
      nextName: trimmed,
      nameRange: currentLayer.nameRange,
    });
    commitPendingChanges(upsertDraftChange(pendingChanges, change));
    setSaveStatus(EMPTY_SAVE_STATUS);
    setActiveTab("Preview");
  };

  const removeLayerRenameDraft = () => {
    commitPendingChanges(removeDraftChange(pendingChanges, layerRenameDraftId));
    setLayerRenameDraft(currentLayer.name);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const addSelectedComboDraft = () => {
    if (!selectedCombo || !comboPreviewState.changed || !comboPreviewState.valid) return;
    const changes = buildComboDraftChanges({
      source: keymapSource,
      combo: selectedCombo,
      bindingRaw: comboDraft.bindingRaw,
      positionsRaw: comboDraft.positionsRaw,
      layersRaw: comboDraft.layersRaw,
      timeoutMsRaw: comboDraft.timeoutMsRaw,
      layerCount: document.layers.length,
    });
    commitPendingChanges(upsertDraftChanges(pendingChanges, changes));
    setSaveStatus(EMPTY_SAVE_STATUS);
    setActiveTab("Preview");
  };

  const removeSelectedComboDraft = () => {
    commitPendingChanges(pendingChanges.filter((change) => !selectedComboDraftIds.includes(change.id)));
    setComboDraft({
      bindingRaw: selectedCombo?.binding || "",
      positionsRaw: selectedCombo?.positions.join(" ") || "",
      layersRaw: selectedCombo?.layers.join(" ") || "",
      timeoutMsRaw: selectedCombo?.timeoutMsRange ? String(selectedCombo.timeoutMs) : "",
    });
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const addNewComboDraft = () => {
    if (!newComboPreviewState.changed || !newComboPreviewState.valid) return;
    const changes = buildNewComboDraftChanges({
      source: keymapSource,
      draft: newComboDraft,
      existingCombos: document.combos,
      keyCount: document.physicalLayout.length,
      layerCount: document.layers.length,
    });
    commitPendingChanges(upsertDraftChanges(pendingChanges, changes));
    setSaveStatus(EMPTY_SAVE_STATUS);
    setActiveTab("Preview");
  };

  const removeNewComboDraft = () => {
    const id = `combo-${newComboDraft.nameRaw.trim()}-node-insert`;
    commitPendingChanges(removeDraftChange(pendingChanges, id));
    setNewComboDraft(createEmptyComboDraft(document.combos));
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const selectMacro = (macro) => {
    setIsAddingMacro(false);
    setSelectedMacroName(macro.name);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const startNewMacro = () => {
    setIsAddingMacro(true);
    setSelectedMacroName("");
    setNewMacroDraft(createEmptyMacroDraft(document.macros));
    setActiveTab("Macros");
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const handleSvgKeyClick = (position) => {
    if (activeTab === "Combos" && (selectedCombo || isAddingCombo)) {
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
    if (!selectedMacro || !macroPreviewState.changed || !macroPreviewState.valid) return;
    const changes = buildMacroDraftChanges({
      source: keymapSource,
      macro: selectedMacro,
      bindingDrafts: macroDraft.bindingDrafts,
      fullBindingList: macroDraft.fullBindingList,
      waitMsRaw: macroDraft.waitMsRaw,
      tapMsRaw: macroDraft.tapMsRaw,
    });
    commitPendingChanges(upsertDraftChanges(pendingChanges, changes));
    setSaveStatus(EMPTY_SAVE_STATUS);
    setActiveTab("Preview");
  };

  const removeSelectedMacroDraft = () => {
    commitPendingChanges(pendingChanges.filter((change) => !selectedMacroDraftIds.includes(change.id)));
    setMacroDraft({
      bindingDrafts: Object.fromEntries(
        (selectedMacro?.bindingEntries || []).map((entry, index) => [index, entry.raw]),
      ),
      fullBindingList: true,
      waitMsRaw: selectedMacro?.waitMsRange ? String(selectedMacro.waitMs) : "",
      tapMsRaw: selectedMacro?.tapMsRange ? String(selectedMacro.tapMs) : "",
    });
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const addNewMacroDraft = () => {
    if (!newMacroPreviewState.changed || !newMacroPreviewState.valid) return;
    const changes = buildNewMacroDraftChanges({
      source: keymapSource,
      draft: newMacroDraft,
      existingMacros: document.macros,
    });
    commitPendingChanges(upsertDraftChanges(pendingChanges, changes));
    setSaveStatus(EMPTY_SAVE_STATUS);
    setActiveTab("Preview");
  };

  const removeNewMacroDraft = () => {
    const id = `macro-${newMacroDraft.nameRaw.trim()}-node-insert`;
    commitPendingChanges(removeDraftChange(pendingChanges, id));
    setNewMacroDraft(createEmptyMacroDraft(document.macros));
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
        : "";

  return (
    <div className="appShell">
      <header className="topBar">
        <div className="brandMark">rB</div>
        <div>
          <h1>roBa Keymap Viewer</h1>
          <p>Read-only MVP from canonical config files</p>
        </div>
        <div className="topBarActions">
          <button type="button" disabled={!saveEndpointAvailable} onClick={reloadKeymapSource}>
            Reload source
          </button>
          <a href="https://zmk.studio/" target="_blank" rel="noreferrer">ZMK Studio</a>
          <a href="https://nickcoutsos.github.io/keymap-editor/" target="_blank" rel="noreferrer">Keymap Editor</a>
        </div>
      </header>

      <section className="statusStrip" aria-label="status">
        <StatusPill label="Source" value="config/roBa.keymap" tone="ok" />
        <StatusPill label="Layout" value={`${document.physicalLayout.length} keys`} tone="ok" />
        <StatusPill label="Pending" value={`${pendingChanges.length} draft${pendingChanges.length === 1 ? "" : "s"}`} tone={pendingChanges.length ? "warn" : "info"} />
        <StatusPill label="Studio" value="official app only" tone="warn" />
        <StatusPill label="Action" value={saveStatus.title || "ready"} tone={getStatusTone(saveStatus)} />
      </section>

      <main className="workspace">
        <aside className="layerRail">
          <div className="railTitle">Layers</div>
          {document.layers.map((layer) => (
            <button
              className={layer.id === activeLayer ? "layerButton active" : "layerButton"}
              key={layer.name}
              onClick={() => {
                setActiveLayer(layer.id);
                setSelectedPosition((position) => Math.min(position, layer.bindings.length - 1));
                setSaveStatus(EMPTY_SAVE_STATUS);
              }}
            >
              <span>{layer.id}</span>
              <strong>{layer.name}</strong>
              <small>{layer.bindings.length}</small>
            </button>
          ))}
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
              <h2>{currentLayer.name}</h2>
            </div>
            <div className="legend">
              <span><i className="editDirect" /> Studio direct</span>
              <span><i className="editBuild" /> Build required</span>
              <span><i className="editSource" /> Source only</span>
            </div>
          </div>
          <KeyboardSvg
            keys={document.physicalLayout}
            bindings={currentLayer.bindings}
            layerNames={layerNames}
            selectedPosition={selectedPosition}
            highlightedPositions={comboHighlightPositions}
            savedOnlyPositions={comboSavedOnlyPositions}
            onSelect={handleSvgKeyClick}
          />
        </section>

        <aside className="detailPane">
          <div className="layerRenameSection">
            <span className="eyebrow">Layer {currentLayer.id} · {currentLayer.name}</span>
            <LayerRenameRow
              currentName={currentLayer.name}
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
          </div>
          <div className="paneHeader compact">
            <div>
              <span className="eyebrow">Selected key</span>
              <h2>Position {selectedPosition}</h2>
            </div>
          </div>
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
          {activeTab === "Combos" && selectedCombo && (
            <ComboDetailPanel
              combo={selectedCombo}
              draft={comboDraft}
              previewState={comboPreviewState}
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
          {activeTab === "Combos" && isAddingCombo && (
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
          {activeTab === "Macros" && selectedMacro && (
            <MacroDetailPanel
              macro={selectedMacro}
              draft={macroDraft}
              previewState={macroPreviewState}
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
          {activeTab === "Macros" && isAddingMacro && (
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
          <div className={editorState.canEdit ? "editorBox" : "editorBox disabled"}>
            <div className="editorHeader">
              <strong>Phase 2 Preview</strong>
              <span>{editorState.canEdit ? "preview only" : "read-only"}</span>
            </div>
            <label>
              <span>Raw binding</span>
              <input
                aria-label="Raw binding"
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
                {captureMode ? "Capture ON" : "Capture"}
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
                Pick keycode
              </button>
              {captureMode && (
                <span className="captureHint">
                  {captureStatus || "キーを押して &kp を入力 / Esc で終了"}
                </span>
              )}
            </div>
            <div className="editorStatus">{editorState.message}</div>
            <SaveStatusPanel status={saveStatus} compact />
            <div className="editorActions">
              <button
                type="button"
                disabled={!editorState.canEdit || !editorState.changed}
                onClick={addSelectedDraft}
              >
                {selectedPendingChange ? "Update draft" : "Add draft"}
              </button>
              <button
                type="button"
                disabled={!selectedPendingChange && !editorState.changed}
                onClick={removeSelectedDraft}
              >
                Remove draft
              </button>
            </div>
            <button
              type="button"
              disabled={!saveEndpointAvailable || !editorState.canEdit || !editorState.changed || saveStatus.tone === "saving"}
              onClick={saveSelectedBinding}
            >
              {saveStatus.tone === "saving" ? "Saving..." : "Save .keymap"}
            </button>
          </div>
        </aside>
      </main>

      {pickerContext && (
        <KeycodePicker
          initialBinding={pickerInitialBinding}
          layerNames={layerNames}
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
            }
            setSaveStatus(EMPTY_SAVE_STATUS);
            setPickerContext(null);
          }}
          onClose={() => setPickerContext(null)}
        />
      )}

      <section className="bottomPanel">
        <nav className="tabBar" aria-label="viewer sections">
          {TABS.map((tab) => (
            <button className={activeTab === tab ? "active" : ""} key={tab} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
          {activeTab === "Bindings" && (
            <input
              aria-label="Search bindings"
              placeholder="Search binding, display, kind..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          )}
        </nav>
        <PanelContent
          tab={activeTab}
          document={document}
          activeLayer={activeLayer}
          layerNames={layerNames}
          search={search}
          markdown={markdown}
          diagnostics={diagnostics}
          editorState={editorState}
          comboPreviewState={comboPreviewState}
          macroPreviewState={macroPreviewState}
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
        />
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
        <strong>Combo</strong>
        <span>{combo.name}</span>
      </div>
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
          <dt>Layers</dt>
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
      <div className={previewState.changed ? "comboPreviewBox active" : "comboPreviewBox"}>
        <label>
          <span>Binding draft</span>
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
              Pick
            </button>
            <button
              type="button"
              disabled={!previewState.canEditBinding}
              className={captureActive ? "pickerInlineBtn captureActive" : "pickerInlineBtn"}
              onClick={onCaptureBinding}
            >
              {captureActive ? "Capture ON" : "Capture"}
            </button>
          </div>
        </label>
        <label>
          <span>Positions draft (SVG のキーをクリックでトグル)</span>
          <input
            aria-label="Combo positions draft"
            value={draft.positionsRaw}
            onChange={(event) => onDraftChange({ ...draft, positionsRaw: event.target.value })}
          />
        </label>
        <label>
          <span>Layers draft</span>
          <input
            aria-label="Combo layers draft"
            placeholder="empty = all layers"
            value={draft.layersRaw}
            onChange={(event) => onDraftChange({ ...draft, layersRaw: event.target.value })}
          />
        </label>
        <label>
          <span>Timeout draft (ms)</span>
          <input
            aria-label="Combo timeout-ms draft"
            placeholder="empty = default 50ms"
            value={draft.timeoutMsRaw}
            onChange={(event) => onDraftChange({ ...draft, timeoutMsRaw: event.target.value })}
          />
        </label>
        <div className="editorStatus">{previewState.message}</div>
        <div className="editorActions">
          <button
            type="button"
            disabled={!previewState.changed || !previewState.valid}
            onClick={onAddDraft}
          >
            {pendingCount ? "Update combo draft" : "Add combo draft"}
          </button>
          <button
            type="button"
            disabled={!pendingCount && !previewState.changed}
            onClick={onRemoveDraft}
          >
            Remove combo draft
          </button>
        </div>
      </div>
      <pre className="rawNodePreview">{combo.raw}</pre>
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
        <strong>New combo</strong>
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
              Pick
            </button>
            <button
              type="button"
              className={captureActive ? "pickerInlineBtn captureActive" : "pickerInlineBtn"}
              onClick={onCaptureBinding}
            >
              {captureActive ? "Capture ON" : "Capture"}
            </button>
          </div>
        </label>
        <label>
          <span>Positions (SVG keys toggle)</span>
          <input
            aria-label="New combo positions"
            value={draft.positionsRaw}
            onChange={(event) => onDraftChange({ ...draft, positionsRaw: event.target.value })}
          />
        </label>
        <label>
          <span>Layers</span>
          <input
            aria-label="New combo layers"
            placeholder="empty = all layers"
            value={draft.layersRaw}
            onChange={(event) => onDraftChange({ ...draft, layersRaw: event.target.value })}
          />
        </label>
        <label>
          <span>Timeout (ms)</span>
          <input
            aria-label="New combo timeout-ms"
            placeholder="empty = default 50ms"
            value={draft.timeoutMsRaw}
            onChange={(event) => onDraftChange({ ...draft, timeoutMsRaw: event.target.value })}
          />
        </label>
        <div className="editorStatus">{previewState.message}</div>
        <div className="editorActions">
          <button
            type="button"
            disabled={!previewState.changed || !previewState.valid}
            onClick={onAddDraft}
          >
            {pending ? "Update new combo draft" : "Add new combo draft"}
          </button>
          <button
            type="button"
            disabled={!pending}
            onClick={onRemoveDraft}
          >
            Remove new combo draft
          </button>
        </div>
      </div>
      <pre className="rawNodePreview">{previewState.change?.nextRaw || "Fill in a valid new combo draft."}</pre>
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
          Remove
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
        <strong>New macro</strong>
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
              Pick
            </button>
            <button
              type="button"
              className={captureActive ? "pickerInlineBtn captureActive" : "pickerInlineBtn"}
              onClick={onCaptureBinding}
            >
              {captureActive ? "Capture ON" : "Capture"}
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
        <div className="editorStatus">{previewState.message}</div>
        <div className="editorActions">
          <button
            type="button"
            disabled={!previewState.changed || !previewState.valid}
            onClick={onAddDraft}
          >
            {pending ? "Update new macro draft" : "Add new macro draft"}
          </button>
          <button
            type="button"
            disabled={!pending}
            onClick={onRemoveDraft}
          >
            Remove new macro draft
          </button>
        </div>
      </div>
      <pre className="rawNodePreview">{previewState.change?.nextRaw || "Fill in a valid new macro draft."}</pre>
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
        <strong>Macro</strong>
        <span>{macro.name}</span>
      </div>
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
      <div className={previewState.changed ? "comboPreviewBox active" : "comboPreviewBox"}>
        {bindingRows.map((value, index) => {
          const editable = index >= existingCount || editableSet.has(index);
          const removable = editable && bindingRows.length > 1;
          const captureActive = captureActiveIndex === index;
          return (
            <label key={index}>
              <span>{`Binding ${index} draft${editable ? "" : " (read-only)"}`}</span>
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
                  Pick
                </button>
                <button
                  type="button"
                  disabled={!editable}
                  className={captureActive ? "pickerInlineBtn captureActive" : "pickerInlineBtn"}
                  onClick={() => onCaptureBinding(index)}
                >
                  {captureActive ? "Capture ON" : "Capture"}
                </button>
                <button
                  type="button"
                  disabled={!removable}
                  className="pickerInlineBtn"
                  onClick={() => onRemoveBindingRow(index)}
                >
                  Remove
                </button>
              </div>
            </label>
          );
        })}
        <button type="button" className="secondaryAction" onClick={onAddBindingRow}>
          Add binding row
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
        <div className="editorStatus">{previewState.message}</div>
        <div className="editorActions">
          <button
            type="button"
            disabled={!previewState.changed || !previewState.valid}
            onClick={onAddDraft}
          >
            {pendingCount ? "Update macro draft" : "Add macro draft"}
          </button>
          <button
            type="button"
            disabled={!pendingCount && !previewState.changed}
            onClick={onRemoveDraft}
          >
            Remove macro draft
          </button>
        </div>
      </div>
      <pre className="rawNodePreview">{macro.raw}</pre>
    </section>
  );
}

function KeyboardSvg({ keys, bindings, layerNames, selectedPosition, highlightedPositions, savedOnlyPositions, onSelect }) {
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
    <svg className="keyboardSvg" viewBox={`-20 -20 ${width} ${height}`} role="img" aria-label="roBa physical keyboard layout">
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
            parsed={parsed}
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

function KeyCap({ keyDef, parsed, selected, highlighted, savedOnly, onSelect }) {
  const x = keyDef.x * UNIT;
  const y = keyDef.y * UNIT;
  const rotate = keyDef.r ? ` rotate(${keyDef.r}, ${(keyDef.rx - keyDef.x) * UNIT}, ${(keyDef.ry - keyDef.y) * UNIT})` : "";
  const className = ["keyCap", highlighted ? "comboHighlighted" : "", savedOnly ? "comboSavedOnly" : "", selected ? "selected" : "", keyDef.thumb ? "thumb" : "", parsed.kind].filter(Boolean).join(" ");

  return (
    <g className={className} transform={`translate(${x}, ${y})${rotate}`} onClick={() => onSelect(keyDef.position)}>
      <rect width={KEY_SIZE} height={KEY_SIZE} rx="6" />
      <text className="keyDisplay" x={KEY_SIZE / 2} y="18">{shorten(parsed.display, 6)}</text>
      <text className="keyRaw" x={KEY_SIZE / 2} y="35">{parsed.behavior.replace("&", "") || parsed.kind}</text>
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
  editorState,
  comboPreviewState,
  macroPreviewState,
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
          <button type="button" onClick={onNewMacro}>New macro</button>
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
              <td>{macro.name}</td>
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
    const sensorRows = document.layers.flatMap((layer) =>
      layer.sensorBindings.map((binding) => ({ layer: layer.name, binding })),
    );
    return (
      <div className="splitPanel">
        <Table
          columns={["Layer", "Sensor binding"]}
          rows={sensorRows}
          renderRow={(row) => (
            <tr key={`${row.layer}-${row.binding}`}>
              <td>{row.layer}</td>
              <td><code>{row.binding}</code></td>
            </tr>
          )}
        />
        <Table
          columns={["Metadata ref", "Name", "Enabled"]}
          rows={document.metadataSensors}
          renderRow={(sensor) => (
            <tr key={sensor.ref}>
              <td>{sensor.ref}</td>
              <td>{sensor.name || sensor.identifier}</td>
              <td>{String(sensor.enabled)}</td>
            </tr>
          )}
        />
      </div>
    );
  }

  if (tab === "Markdown") {
    return <pre className="markdownPreview">{markdown}</pre>;
  }

  if (tab === "Preview") {
    return (
      <PreviewPanel
        editorState={editorState}
        comboPreviewState={comboPreviewState}
        macroPreviewState={macroPreviewState}
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
        <button type="button" onClick={onNewCombo}>New combo</button>
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
            <td>{combo.name}</td>
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
  const selectedRowRef = useRef(null);
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

  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeLayer, selectedPosition, search]);

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
                ref={selected ? selectedRowRef : null}
              >
                <td>{row.position}</td>
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
  editorState,
  comboPreviewState,
  macroPreviewState,
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
  const activeSinglePreview = comboPreviewState?.changed
    ? comboPreviewState
    : macroPreviewState?.changed
      ? macroPreviewState
      : editorState;
  const previewSource = pendingChanges.length ? pendingState.nextSource : activeSinglePreview.nextSource;
  const contextDiff = pendingChanges.length
    ? pendingState.contextDiff || pendingState.message
    : activeSinglePreview.contextDiff || activeSinglePreview.diff || activeSinglePreview.message || "No change.";

  return (
    <div className={saveStatus.message ? "previewPanel hasStatus" : "previewPanel"}>
      <SaveStatusPanel status={saveStatus} />
      <div className="diffGrid">
        <div>
          <div className="previewHeader">
            <h3>Pending Changes</h3>
            <div className="previewActions">
              <button
                type="button"
                disabled={!saveEndpointAvailable || !pendingChanges.length || !pendingState.valid || saveStatus.tone === "saving"}
                onClick={onSavePendingChanges}
                title="Save all (Ctrl+S)"
              >
                {saveStatus.tone === "saving" ? "Saving..." : "Save all"}
              </button>
              <button type="button" disabled={!pendingChanges.length} onClick={onClearPendingChanges}>Clear all</button>
              <button type="button" disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl+Z)">Undo</button>
              <button type="button" disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl+Shift+Z)">Redo</button>
            </div>
          </div>
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
          <h3>Context Diff</h3>
          <pre className="diffPreview">{contextDiff}</pre>
        </div>
        <div>
          <h3>.keymap Preview</h3>
          <pre className="sourcePreview">{previewSource}</pre>
        </div>
      </div>
    </div>
  );
}

function PendingChangesList({ changes, message, onSelect, onRemove }) {
  if (!changes.length) {
    return <div className="pendingEmpty">{message}</div>;
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
          <button type="button" className="pendingRemove" onClick={() => onRemove(change.id)}>Remove</button>
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
  if (!status.message) return null;

  const className = `${compact ? "saveStatus" : "previewSaveStatus"} ${status.tone}`;
  return (
    <div className={className} role={status.tone === "error" ? "alert" : "status"}>
      <strong>{status.title}</strong>
      <span>{status.message}</span>
      {status.backupPath && (
        <div className="backupPathBlock">
          <span className="backupPathLabel">Backup path</span>
          <code className="backupPathValue">{status.backupPath}</code>
        </div>
      )}
      {status.drawerMessage && (
        <div className="drawerStatusLine">
          <span className="drawerStatusLabel">keymap-drawer</span>
          <span>{status.drawerMessage}</span>
        </div>
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

function formatRange(range) {
  return range ? `${range.start}..${range.end}` : "Unavailable";
}

function KeycodePicker({ initialBinding = "", layerNames = [], onSelect, onClose }) {
  const initialDraft = useMemo(
    () => parseStructuredBinding(initialBinding, layerNames.length),
    [initialBinding, layerNames.length],
  );
  const [draft, setDraft] = useState(initialDraft);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
    <div className="pickerOverlay" onClick={onClose}>
      <div
        className="pickerDialog"
        role="dialog"
        aria-label="Pick binding"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pickerHeader">
          <strong>Pick binding</strong>
          <button type="button" className="pickerClose" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="structuredPicker">
          <div className="behaviorPicker" role="group" aria-label="Behavior">
            {STRUCTURED_BEHAVIORS.map((behavior) => {
              const label = STRUCTURED_BEHAVIOR_LABELS[behavior];
              return (
                <button
                  type="button"
                  key={behavior}
                  className={draft.behavior === behavior ? "active" : ""}
                  onClick={() => setDraft((prev) => ({ ...prev, behavior }))}
                  title={label.long}
                  aria-label={label.long}
                >
                  {label.short}
                </button>
              );
            })}
          </div>
          {draft.behavior === "&lt" && (
            <label>
              <span>Hold layer</span>
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
              <span>Hold modifier</span>
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
          <label>
            <span>Tap keycode</span>
            <input
              value={draft.keycode}
              onChange={(event) => setDraft((prev) => ({ ...prev, keycode: event.target.value }))}
              aria-label="Structured picker keycode"
            />
          </label>
          {draft.behavior === "&kp" && (
            <div className="keypressModifierGroup" role="group" aria-label="Key Press modifiers">
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
          )}
          <div className="structuredPreview">
            <code>{structuredState.ok ? structuredState.binding : structuredState.message}</code>
            <button
              type="button"
              disabled={!structuredState.ok}
              onClick={() => onSelect(buildStructuredBinding(draft, layerNames.length))}
            >
              Use binding
            </button>
          </div>
        </div>
        <input
          ref={searchRef}
          className="pickerSearch"
          placeholder="Search code, label, alias…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search keycodes"
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
            <div className="pickerEmpty">No keycodes match.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
