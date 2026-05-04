import keymapSource from "../../../config/roBa.keymap?raw";
import roBaMetadata from "../../../config/roBa.json";
import dtsiSource from "../../../boards/shields/roBa/roBa.dtsi?raw";
import { useMemo, useState } from "react";
import { buildMarkdown } from "./export/markdown.js";
import { describeBinding } from "./keymap/bindingDisplay.js";
import { countDtsPhysicalKeys, parseKeymap } from "./keymap/parseKeymap.js";

const KEY_SIZE = 44;
const UNIT = 48;
const TRACKBALL = { x: 10, y: 3.8, r: 0.62 };

const TABS = ["Bindings", "Combos", "Macros", "Behaviors", "Sensors", "Markdown", "Diagnostics"];

function App() {
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
  }, []);

  const [activeLayer, setActiveLayer] = useState(0);
  const [selectedPosition, setSelectedPosition] = useState(0);
  const [activeTab, setActiveTab] = useState("Bindings");
  const [search, setSearch] = useState("");

  const layerNames = document.layers.map((layer) => layer.name);
  const currentLayer = document.layers[activeLayer] || document.layers[0];
  const selectedBinding = currentLayer.bindings[selectedPosition] || "&trans";
  const selectedParsed = describeBinding(selectedBinding, layerNames);
  const markdown = useMemo(() => buildMarkdown(document), [document]);
  const diagnostics = getDiagnostics(document);

  return (
    <div className="appShell">
      <header className="topBar">
        <div className="brandMark">rB</div>
        <div>
          <h1>roBa Keymap Viewer</h1>
          <p>Read-only MVP from canonical config files</p>
        </div>
        <div className="topBarActions">
          <a href="https://zmk.studio/" target="_blank" rel="noreferrer">ZMK Studio</a>
          <a href="https://nickcoutsos.github.io/keymap-editor/" target="_blank" rel="noreferrer">Keymap Editor</a>
        </div>
      </header>

      <section className="statusStrip" aria-label="status">
        <StatusPill label="Source" value="config/roBa.keymap" tone="ok" />
        <StatusPill label="Layout" value={`${document.physicalLayout.length} keys`} tone="ok" />
        <StatusPill label="Mode" value="read-only" tone="info" />
        <StatusPill label="Studio" value="official app only" tone="warn" />
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
            onSelect={setSelectedPosition}
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
          <div className="disabledBox">
            <strong>Phase 1</strong>
            <span>Editing and firmware writes are intentionally disabled in this MVP.</span>
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
          onSelectPosition={setSelectedPosition}
        />
      </section>
    </div>
  );
}

function KeyboardSvg({ keys, bindings, layerNames, selectedPosition, onSelect }) {
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
            onSelect={onSelect}
          />
        );
      })}
    </svg>
  );
}

function KeyCap({ keyDef, parsed, selected, onSelect }) {
  const x = keyDef.x * UNIT;
  const y = keyDef.y * UNIT;
  const rotate = keyDef.r ? ` rotate(${keyDef.r}, ${(keyDef.rx - keyDef.x) * UNIT}, ${(keyDef.ry - keyDef.y) * UNIT})` : "";
  const className = ["keyCap", selected ? "selected" : "", keyDef.thumb ? "thumb" : "", parsed.kind].filter(Boolean).join(" ");

  return (
    <g className={className} transform={`translate(${x}, ${y})${rotate}`} onClick={() => onSelect(keyDef.position)}>
      <rect width={KEY_SIZE} height={KEY_SIZE} rx="6" />
      <text className="keyDisplay" x={KEY_SIZE / 2} y="18">{shorten(parsed.display, 6)}</text>
      <text className="keyRaw" x={KEY_SIZE / 2} y="35">{parsed.behavior.replace("&", "") || parsed.kind}</text>
      <text className="keyIndex" x={KEY_SIZE - 4} y={KEY_SIZE - 4}>{keyDef.position}</text>
    </g>
  );
}

function PanelContent({ tab, document, activeLayer, layerNames, search, markdown, diagnostics, onSelectPosition }) {
  if (tab === "Bindings") {
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
      <Table
        columns={["Pos", "Layer", "Display", "Binding", "Kind", "Editability", "Notes"]}
        rows={filtered}
        renderRow={(row) => (
          <tr key={`${row.layer.id}-${row.position}`} onClick={() => onSelectPosition(row.position)}>
            <td>{row.position}</td>
            <td>{row.layer.name}</td>
            <td><strong>{row.parsed.display}</strong></td>
            <td><code>{row.binding}</code></td>
            <td>{row.parsed.kind}</td>
            <td>{row.parsed.editability}</td>
            <td>{row.parsed.note}</td>
          </tr>
        )}
      />
    );
  }

  if (tab === "Combos") {
    return (
      <Table
        columns={["Name", "Positions", "Binding", "Layers", "Timeout"]}
        rows={document.combos}
        renderRow={(combo) => (
          <tr key={combo.name}>
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

export default App;
