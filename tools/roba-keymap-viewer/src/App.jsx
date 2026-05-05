import initialKeymapSource from "../../../config/roBa.keymap?raw";
import roBaMetadata from "../../../config/roBa.json";
import dtsiSource from "../../../boards/shields/roBa/roBa.dtsi?raw";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildMarkdown } from "./export/markdown.js";
import { describeBinding } from "./keymap/bindingDisplay.js";
import { buildComboPreviewState } from "./keymap/comboPreview.js";
import { buildEditorState } from "./keymap/editorPreview.js";
import { countDtsPhysicalKeys, parseKeymap } from "./keymap/parseKeymap.js";
import {
  buildDraftChange,
  buildPendingChangesState,
  getDraftId,
  removeDraftChange,
  upsertDraftChange,
} from "./keymap/pendingChanges.js";

const KEY_SIZE = 44;
const UNIT = 48;
const TRACKBALL = { x: 10, y: 3.8, r: 0.62 };

const TABS = ["Bindings", "Combos", "Macros", "Behaviors", "Sensors", "Preview", "Markdown", "Diagnostics"];
const EMPTY_SAVE_STATUS = { tone: "idle", title: "", message: "", backupPath: "" };

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
  const [selectedComboName, setSelectedComboName] = useState("");
  const [comboDraft, setComboDraft] = useState({ bindingRaw: "", positionsRaw: "" });

  const layerNames = document.layers.map((layer) => layer.name);
  const currentLayer = document.layers[activeLayer] || document.layers[0];
  const selectedCombo = document.combos.find((combo) => combo.name === selectedComboName);
  const comboHighlightPositions = activeTab === "Combos" && selectedCombo
    ? new Set(selectedCombo.positions)
    : new Set();
  const selectedBinding = currentLayer.bindings[selectedPosition] || "&trans";
  const selectedEntry = currentLayer.bindingEntries?.[selectedPosition];
  const selectedDraftId = getDraftId(activeLayer, selectedPosition);
  const selectedPendingChange = pendingChanges.find((change) => change.id === selectedDraftId);
  const selectedParsed = describeBinding(selectedBinding, layerNames);
  const selectedRange = selectedEntry?.sourceRange;
  const effectiveDraftBinding = draftBinding ?? selectedPendingChange?.nextRaw ?? selectedEntry?.raw ?? selectedBinding;
  const editorState = useMemo(
    () => buildEditorState(keymapSource, selectedEntry, effectiveDraftBinding, document.layers),
    [selectedEntry, effectiveDraftBinding, document],
  );
  const pendingState = useMemo(
    () => buildPendingChangesState(keymapSource, pendingChanges, document.layers),
    [keymapSource, pendingChanges, document.layers],
  );
  const comboPreviewState = useMemo(
    () => buildComboPreviewState(keymapSource, selectedCombo, comboDraft, document.physicalLayout.length),
    [keymapSource, selectedCombo, comboDraft, document.physicalLayout.length],
  );
  const markdown = useMemo(() => buildMarkdown(document), [document]);
  const diagnostics = getDiagnostics(document);

  useEffect(() => {
    setDraftBinding(selectedPendingChange?.nextRaw || selectedEntry?.raw || selectedBinding);
  }, [selectedEntry, selectedBinding, selectedPendingChange]);

  useEffect(() => {
    setComboDraft({
      bindingRaw: selectedCombo?.binding || "",
      positionsRaw: selectedCombo?.positions.join(" ") || "",
    });
  }, [selectedCombo]);

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
      setDraftBinding(null);
      setPendingChanges([]);
      setSaveStatus({
        tone: "ok",
        title: "Reloaded source",
        message: "Loaded the latest config/roBa.keymap from disk.",
        backupPath: "",
      });
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
      });
      setActiveTab("Preview");
    } catch (error) {
      setSaveStatus({
        tone: "error",
        title: "Save failed",
        message: error.message,
        backupPath: "",
      });
    }
  };

  const saveAllPendingChanges = async () => {
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
            range: change.range,
            currentRaw: change.currentRaw,
            nextRaw: change.nextRaw,
          })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Save all failed.");
      }

      setKeymapSource(payload.source);
      setDraftBinding(null);
      setPendingChanges([]);
      setSaveStatus({
        tone: "ok",
        title: "Saved pending changes",
        message: payload.message || "Backup created before writing config/roBa.keymap.",
        backupPath: payload.backupPath,
      });
      setActiveTab("Preview");
    } catch (error) {
      setSaveStatus({
        tone: "error",
        title: "Save all failed",
        message: error.message,
        backupPath: "",
      });
    }
  };

  const selectBinding = (layerId, position) => {
    setActiveLayer(layerId);
    setSelectedPosition(position);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const selectCombo = (combo) => {
    setSelectedComboName(combo.name);
    if (combo.layers.length) setActiveLayer(combo.layers[0]);
    if (combo.positions.length) setSelectedPosition(combo.positions[0]);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const addSelectedDraft = () => {
    if (!editorState.canEdit || !selectedEntry?.sourceRange) return;
    const change = buildDraftChange({
      layerIndex: activeLayer,
      layerName: currentLayer.name,
      position: selectedPosition,
      entry: selectedEntry,
      nextRaw: effectiveDraftBinding,
    });
    setPendingChanges((changes) => upsertDraftChange(changes, change));
    setSaveStatus(EMPTY_SAVE_STATUS);
    setActiveTab("Preview");
  };

  const removeSelectedDraft = () => {
    setPendingChanges((changes) => removeDraftChange(changes, selectedDraftId));
    setDraftBinding(selectedEntry?.raw || selectedBinding);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

  const clearPendingChanges = () => {
    setPendingChanges([]);
    setDraftBinding(selectedEntry?.raw || selectedBinding);
    setSaveStatus(EMPTY_SAVE_STATUS);
  };

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
            onSelect={(position) => selectBinding(activeLayer, position)}
          />
        </section>

        <aside className="detailPane">
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
              onDraftChange={(nextDraft) => {
                setComboDraft(nextDraft);
                setSaveStatus(EMPTY_SAVE_STATUS);
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
                  setSaveStatus(EMPTY_SAVE_STATUS);
                  setActiveTab("Preview");
                }}
              />
            </label>
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
                disabled={!selectedPendingChange}
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
          pendingChanges={pendingChanges}
          pendingState={pendingState}
          saveStatus={saveStatus}
          selectedPosition={selectedPosition}
          selectedComboName={selectedComboName}
          onSelectBinding={selectBinding}
          onSelectCombo={selectCombo}
          onRemovePendingChange={(id) => setPendingChanges((changes) => removeDraftChange(changes, id))}
          onClearPendingChanges={clearPendingChanges}
          onSavePendingChanges={saveAllPendingChanges}
          saveEndpointAvailable={saveEndpointAvailable}
        />
      </section>
    </div>
  );
}

function ComboDetailPanel({ combo, draft, previewState, onDraftChange }) {
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
          <input
            aria-label="Combo binding draft"
            disabled={!previewState.canEditBinding}
            value={draft.bindingRaw}
            onChange={(event) => onDraftChange({ ...draft, bindingRaw: event.target.value })}
          />
        </label>
        <label>
          <span>Positions draft</span>
          <input
            aria-label="Combo positions draft"
            value={draft.positionsRaw}
            onChange={(event) => onDraftChange({ ...draft, positionsRaw: event.target.value })}
          />
        </label>
        <div className="editorStatus">{previewState.message}</div>
      </div>
      <pre className="rawNodePreview">{combo.raw}</pre>
    </section>
  );
}

function KeyboardSvg({ keys, bindings, layerNames, selectedPosition, highlightedPositions, onSelect }) {
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
            onSelect={onSelect}
          />
        );
      })}
    </svg>
  );
}

function KeyCap({ keyDef, parsed, selected, highlighted, onSelect }) {
  const x = keyDef.x * UNIT;
  const y = keyDef.y * UNIT;
  const rotate = keyDef.r ? ` rotate(${keyDef.r}, ${(keyDef.rx - keyDef.x) * UNIT}, ${(keyDef.ry - keyDef.y) * UNIT})` : "";
  const className = ["keyCap", highlighted ? "comboHighlighted" : "", selected ? "selected" : "", keyDef.thumb ? "thumb" : "", parsed.kind].filter(Boolean).join(" ");

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
  pendingChanges,
  pendingState,
  saveStatus,
  selectedPosition,
  selectedComboName,
  onSelectBinding,
  onSelectCombo,
  onRemovePendingChange,
  onClearPendingChanges,
  onSavePendingChanges,
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
      />
    );
  }

  if (tab === "Macros") {
    return (
      <Table
        columns={["Name", "Compatible", "Binding cells", "Bindings"]}
        rows={document.macros}
        renderRow={(macro) => (
          <tr key={macro.name}>
            <td>{macro.name}</td>
            <td>{macro.compatible}</td>
            <td>{macro.bindingCells}</td>
            <td><code>{macro.bindings.join(" ; ")}</code></td>
          </tr>
        )}
      />
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
        pendingChanges={pendingChanges}
        pendingState={pendingState}
        saveStatus={saveStatus}
        onSelectBinding={onSelectBinding}
        onRemovePendingChange={onRemovePendingChange}
        onClearPendingChanges={onClearPendingChanges}
        onSavePendingChanges={onSavePendingChanges}
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

function CombosTable({ combos, selectedComboName, onSelectCombo }) {
  return (
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
  pendingChanges,
  pendingState,
  saveStatus,
  onSelectBinding,
  onRemovePendingChange,
  onClearPendingChanges,
  onSavePendingChanges,
  saveEndpointAvailable,
}) {
  const activeSinglePreview = comboPreviewState?.changed ? comboPreviewState : editorState;
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
              >
                {saveStatus.tone === "saving" ? "Saving..." : "Save all"}
              </button>
              <button type="button" disabled={!pendingChanges.length} onClick={onClearPendingChanges}>Clear all</button>
            </div>
          </div>
          <PendingChangesList
            changes={pendingChanges}
            message={pendingState.message}
            onSelect={onSelectBinding}
            onRemove={onRemovePendingChange}
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
          <button type="button" className="pendingMain" onClick={() => onSelect(change.layerIndex, change.position)}>
            <strong>{change.layerName}</strong>
            <span>POS{change.position}</span>
            <code>{change.currentRaw} {"->"} {change.nextRaw}</code>
          </button>
          <button type="button" className="pendingRemove" onClick={() => onRemove(change.id)}>Remove</button>
        </div>
      ))}
    </div>
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
    </div>
  );
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
    { label: "Combo count", value: document.combos.length, ok: document.combos.length === 5 },
    { label: "Macro count", value: document.macros.length, ok: document.macros.length === 1 },
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

export default App;
