// Bottom tab panels: Bindings, Combos, Macros, Behaviors, Sensors, Markdown
const { useState: useStateTab, useMemo: useMemoTab } = React;

/* ── shared table styles ── */
const tblS = {
  table: {
    width: '100%', borderCollapse: 'collapse', fontSize: '11px',
    fontFamily: 'Inter, sans-serif',
  },
  th: {
    padding: '5px 8px', textAlign: 'left', fontSize: '10px',
    color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid #1f2235', fontWeight: 500, whiteSpace: 'nowrap',
    position: 'sticky', top: 0, background: '#13151f', zIndex: 1,
  },
  td: {
    padding: '4px 8px', borderBottom: '1px solid #161928', verticalAlign: 'middle',
    color: '#c8d0e0',
  },
  mono: { fontFamily: 'JetBrains Mono, monospace', color: '#a5f3a0', fontSize: '10px' },
  kindBadge: (kind) => {
    const c = { keypress:'#60a5fa', 'mod-tap':'#a78bfa', 'layer-tap':'#34d399', momentary:'#34d399',
      transparent:'#374151', 'mouse-btn':'#fb923c', 'mouse-move':'#fb923c',
      'mouse-scroll':'#fb923c', bluetooth:'#e879f9', custom:'#9ca3af' };
    return { fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', padding: '1px 5px',
      borderRadius: '3px', background: (c[kind]||'#9ca3af')+'1a', color: c[kind]||'#9ca3af' };
  },
  editBadge: (e) => {
    const c = { 'studio-direct':'#3b82f6', 'build-required':'#f59e0b', 'source-only':'#ef4444' };
    return { fontSize: '10px', padding: '1px 5px', borderRadius: '3px',
      background: (c[e]||'#6b7280')+'1a', color: c[e]||'#6b7280' };
  },
};

/* ── search / filter input ── */
function FilterBar({ search, onSearch, layerFilter, onLayerFilter, layers }) {
  return (
    <div style={{ display:'flex', gap:'8px', padding:'8px 10px', borderBottom:'1px solid #1f2235', alignItems:'center' }}>
      <input
        value={search}
        onChange={e => onSearch(e.target.value)}
        placeholder="Search bindings…"
        style={{
          flex:1, padding:'4px 8px', background:'#161928', border:'1px solid #2d3148',
          borderRadius:'4px', color:'#c8d0e0', fontSize:'11px', fontFamily:'Inter',
          outline:'none',
        }}
      />
      {layers && (
        <select
          value={layerFilter}
          onChange={e => onLayerFilter(e.target.value)}
          style={{
            padding:'4px 8px', background:'#161928', border:'1px solid #2d3148',
            borderRadius:'4px', color:'#c8d0e0', fontSize:'11px', fontFamily:'JetBrains Mono',
            outline:'none', cursor:'pointer',
          }}
        >
          <option value="all">All layers</option>
          {layers.map((l,i) => <option key={i} value={String(i)}>{l}</option>)}
        </select>
      )}
    </div>
  );
}

/* ── BINDINGS TAB ── */
function BindingsTab({ keys, layerBindings, layerNames, currentLayer, onKeySelect }) {
  const [search, setSearch] = useStateTab('');
  const [layerFilter, setLayerFilter] = useStateTab(String(currentLayer));
  const { parseBinding } = window.ROBA_DATA;

  // Sync layer filter when current layer changes
  React.useEffect(() => { setLayerFilter(String(currentLayer)); }, [currentLayer]);

  const rows = useMemoTab(() => {
    const li = layerFilter === 'all' ? null : parseInt(layerFilter);
    const layers = li !== null ? [li] : layerNames.map((_,i) => i);
    const result = [];
    layers.forEach(li => {
      keys.forEach(k => {
        const raw = (layerBindings[li] || [])[k.pos] || '&trans';
        const parsed = parseBinding(raw);
        if (search) {
          const q = search.toLowerCase();
          const posMatch = String(k.pos).includes(q);
          const rawMatch = raw.toLowerCase().includes(q);
          const dispMatch = parsed.display.toLowerCase().includes(q);
          const kindMatch = parsed.kind.includes(q);
          const noteMatch = (parsed.note||'').toLowerCase().includes(q);
          const handMatch = k.hand.toLowerCase().includes(q);
          if (!posMatch && !rawMatch && !dispMatch && !kindMatch && !noteMatch && !handMatch) return;
        }
        result.push({ key: k, raw, parsed, layerIdx: li, layerName: layerNames[li] });
      });
    });
    return result;
  }, [search, layerFilter, keys, layerBindings, layerNames]);

  // Count non-transparent
  const activeCount = rows.filter(r => r.parsed.kind !== 'transparent').length;

  const [hideTransparent, setHideTransparent] = useStateTab(true);
  const visibleRows = hideTransparent ? rows.filter(r => r.parsed.kind !== 'transparent') : rows;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <FilterBar search={search} onSearch={setSearch}
        layerFilter={layerFilter} onLayerFilter={setLayerFilter} layers={layerNames} />
      <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'3px 10px', borderBottom:'1px solid #1a1d2e', flexShrink:0 }}>
        <span style={{ fontSize:'10px', color:'#4b5563' }}>{visibleRows.length} bindings{hideTransparent ? ` (${rows.length - visibleRows.length} transparent hidden)` : ''}</span>
        <label style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', color:'#6b7280', cursor:'pointer', marginLeft:'auto' }}>
          <input type="checkbox" checked={hideTransparent} onChange={e => setHideTransparent(e.target.checked)}
            style={{ width:11, height:11, cursor:'pointer' }} />
          Hide transparent
        </label>
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        <table style={tblS.table}>
          <thead>
            <tr>
              {['Pos','Hand','Display','Raw Binding','Kind','Editability','Notes'].map(h => (
                <th key={h} style={tblS.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, i) => (
              <tr key={i}
                style={{ cursor:'pointer' }}
                onClick={() => onKeySelect(row.key, row.parsed)}
                onMouseEnter={e => e.currentTarget.style.background='#1a1d27'}
                onMouseLeave={e => e.currentTarget.style.background=''}
              >
                <td style={{ ...tblS.td, ...tblS.mono }}>{row.key.pos}</td>
                <td style={{ ...tblS.td, fontSize:'10px', color: row.key.hand==='L' ? '#60a5fa' : '#a78bfa' }}>{row.key.hand}</td>
                <td style={{ ...tblS.td, fontWeight:600, color: row.parsed.kind==='transparent'?'#2d3148':'#e2e8f0' }}>{row.parsed.display}</td>
                <td style={{ ...tblS.td, ...tblS.mono, maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={row.raw}>{row.raw}</td>
                <td style={tblS.td}><span style={tblS.kindBadge(row.parsed.kind)}>{row.parsed.kind}</span></td>
                <td style={tblS.td}><span style={tblS.editBadge(row.parsed.editability)}>{row.parsed.editability}</span></td>
                <td style={{ ...tblS.td, fontSize:'10px', color:'#4b5563', maxWidth:'120px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={row.parsed.note||''}>{row.parsed.note || (row.parsed.winJis ? `JIS: ${row.parsed.winJis}` : '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleRows.length === 0 && (
          <div style={{ textAlign:'center', padding:'24px', color:'#374151', fontSize:'11px' }}>No bindings match filter</div>
        )}
      </div>
    </div>
  );
}

/* ── COMBOS TAB ── */
function CombosTab({ combos, layerNames, onHighlightPositions }) {
  const [activeCombo, setActiveCombo] = useStateTab(null);
  const handleRow = (combo) => {
    if (activeCombo === combo.name) {
      setActiveCombo(null);
      onHighlightPositions([]);
    } else {
      setActiveCombo(combo.name);
      onHighlightPositions(combo.positions);
    }
  };
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'6px 10px', borderBottom:'1px solid #1f2235', fontSize:'10px', color:'#6b7280' }}>
        Click a combo row to highlight keys on the keyboard above
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        <table style={tblS.table}>
          <thead>
            <tr>
              {['Name','Positions','Keys','Binding','Layers','Timeout','Status'].map(h => (
                <th key={h} style={tblS.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {combos.map((combo, i) => (
              <tr key={i}
                style={{ cursor:'pointer', background: activeCombo===combo.name ? '#2d2010' : '' }}
                onClick={() => handleRow(combo)}
                onMouseEnter={e => { if(activeCombo!==combo.name) e.currentTarget.style.background='#1a1d27'; }}
                onMouseLeave={e => { if(activeCombo!==combo.name) e.currentTarget.style.background=''; }}
              >
                <td style={{ ...tblS.td, ...tblS.mono, color:'#c8d0e0' }}>{combo.name}</td>
                <td style={{ ...tblS.td, ...tblS.mono }}>{combo.positions.join('+')}</td>
                <td style={{ ...tblS.td, color:'#e2e8f0', fontWeight:500 }}>{combo.keys.join(' + ')}</td>
                <td style={{ ...tblS.td, ...tblS.mono }}>{combo.binding}</td>
                <td style={{ ...tblS.td, fontSize:'10px', color:'#6b7280' }}>{combo.layers.map(l=>layerNames[l]).join(', ')}</td>
                <td style={{ ...tblS.td, ...tblS.mono }}>{combo.timeout}ms</td>
                <td style={tblS.td}>
                  <span style={{ fontSize:'10px', padding:'1px 5px', borderRadius:'3px',
                    background: combo.status==='ok' ? 'rgba(52,211,153,0.1)' : 'rgba(245,158,11,0.1)',
                    color: combo.status==='ok' ? '#34d399' : '#f59e0b' }}>
                    {combo.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── MACROS TAB ── */
function MacrosTab({ macros, behaviors }) {
  const [view, setView] = useStateTab('macros');
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid #1f2235' }}>
        {['macros','behaviors'].map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding:'5px 14px', background:'none', border:'none', borderBottom: view===v ? '2px solid #3b82f6' : '2px solid transparent',
            color: view===v ? '#60a5fa' : '#6b7280', fontSize:'11px', cursor:'pointer', fontFamily:'Inter',
          }}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>
        ))}
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        {view === 'macros' ? (
          <table style={tblS.table}>
            <thead>
              <tr>{['Name','Compatible','Steps','Summary','Status'].map(h=><th key={h} style={tblS.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {macros.map((m,i) => (
                <tr key={i} onMouseEnter={e=>e.currentTarget.style.background='#1a1d27'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <td style={{...tblS.td,...tblS.mono,color:'#c8d0e0'}}>{m.name}</td>
                  <td style={{...tblS.td,fontSize:'10px',color:'#6b7280'}}>{m.compatible}</td>
                  <td style={{...tblS.td,...tblS.mono}}>{m.steps}</td>
                  <td style={{...tblS.td,color:'#c8d0e0'}}>{m.summary}</td>
                  <td style={tblS.td}><span style={tblS.editBadge('studio-direct')}>{m.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table style={tblS.table}>
            <thead>
              <tr>{['Name','Compatible','Binding Cells','Uses','Raw Def','Status'].map(h=><th key={h} style={tblS.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {behaviors.map((b,i) => (
                <tr key={i} onMouseEnter={e=>e.currentTarget.style.background='#1a1d27'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <td style={{...tblS.td,...tblS.mono,color:'#c8d0e0'}}>{b.name}</td>
                  <td style={{...tblS.td,fontSize:'10px',color:'#6b7280'}}>{b.compatible}</td>
                  <td style={{...tblS.td,...tblS.mono}}>{b.bindingCells}</td>
                  <td style={{...tblS.td,...tblS.mono}}>{b.uses}</td>
                  <td style={{...tblS.td,...tblS.mono,color:'#9ca3af'}}>{b.rawDef}</td>
                  <td style={tblS.td}><span style={tblS.editBadge('studio-direct')}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ── SENSORS TAB ── */
function SensorsTab({ sensors }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'6px 10px', borderBottom:'1px solid #1f2235', fontSize:'10px', color:'#6b7280', display:'flex', gap:'6px', alignItems:'center' }}>
        <span style={{ width:6, height:6, borderRadius:'50%', background:'#f59e0b', display:'inline-block' }}></span>
        Encoder availability determined by <span style={{ fontFamily:'JetBrains Mono', color:'#a5f3a0' }}>sensor-bindings</span> in .keymap, not .json metadata
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        <table style={tblS.table}>
          <thead>
            <tr>{['Layer','Sensor','Raw Binding','Display Meaning'].map(h=><th key={h} style={tblS.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {sensors.map((s,i) => (
              <tr key={i} onMouseEnter={e=>e.currentTarget.style.background='#1a1d27'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                <td style={{...tblS.td,color:'#c8d0e0'}}>{s.layer}</td>
                <td style={{...tblS.td,...tblS.mono,color:'#9ca3af'}}>{s.sensor}</td>
                <td style={{...tblS.td,...tblS.mono}}>{s.rawBinding}</td>
                <td style={{...tblS.td,color:'#e2e8f0',fontWeight:500}}>{s.display}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── MARKDOWN TAB ── */
function MarkdownTab({ keys, layerBindings, layerNames, combos, macros, behaviors, sensors }) {
  const { parseBinding } = window.ROBA_DATA;
  const [copied, setCopied] = useStateTab(false);

  const md = useMemoTab(() => {
    let out = '# roBa Keymap Reference\n\n';
    out += `> Generated: ${new Date().toISOString().slice(0,10)}  \n`;
    out += `> Source: \`config/roBa.keymap\` (canonical)  \n`;
    out += `> Mode: Read-only\n\n`;

    // Layers
    out += '## Key Bindings by Layer\n\n';
    layerNames.forEach((name, li) => {
      out += `### Layer ${li}: ${name}\n\n`;
      out += '| Pos | Key | Raw Binding | Kind | Editability |\n';
      out += '|-----|-----|-------------|------|-------------|\n';
      keys.forEach(k => {
        const raw = (layerBindings[li] || [])[k.pos] || '&trans';
        const p = parseBinding(raw);
        if (p.kind === 'transparent') return;
        out += `| ${k.pos} | ${k.label} | \`${raw}\` | ${p.kind} | ${p.editability} |\n`;
      });
      out += '\n';
    });

    // Combos
    out += '## Combos\n\n';
    out += '| Name | Positions | Keys | Binding | Layers | Timeout |\n';
    out += '|------|-----------|------|---------|--------|--------|\n';
    combos.forEach(c => {
      out += `| ${c.name} | ${c.positions.join('+')} | ${c.keys.join(' + ')} | \`${c.binding}\` | ${c.layers.map(l=>layerNames[l]).join(', ')} | ${c.timeout}ms |\n`;
    });
    out += '\n';

    // Macros
    out += '## Macros\n\n';
    out += '| Name | Compatible | Steps | Summary |\n';
    out += '|------|-----------|-------|--------|\n';
    macros.forEach(m => {
      out += `| ${m.name} | ${m.compatible} | ${m.steps} | ${m.summary} |\n`;
    });
    out += '\n';

    // Behaviors
    out += '## Custom Behaviors\n\n';
    out += '| Name | Compatible | Binding Cells | Uses |\n';
    out += '|------|-----------|--------------|------|\n';
    behaviors.forEach(b => {
      out += `| ${b.name} | ${b.compatible} | ${b.bindingCells} | ${b.uses} |\n`;
    });
    out += '\n';

    // Sensors
    out += '## Sensor Bindings\n\n';
    out += '| Layer | Sensor | Raw Binding | Display |\n';
    out += '|-------|--------|-------------|--------|\n';
    sensors.forEach(s => {
      out += `| ${s.layer} | ${s.sensor} | \`${s.rawBinding}\` | ${s.display} |\n`;
    });
    out += '\n';

    // Warnings
    out += '## Warnings\n\n';
    out += '- Read-only mode — canonical source: `config/roBa.keymap`\n';
    out += '- ZMK Studio direct changes may diverge from repo .keymap\n';
    out += '- Sensor availability determined by `.keymap` sensor-bindings, not `.json` metadata\n';

    return out;
  }, [keys, layerBindings, layerNames, combos, macros, behaviors, sensors]);

  const handleCopy = () => {
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', borderBottom:'1px solid #1f2235' }}>
        <span style={{ fontSize:'11px', color:'#6b7280' }}>Markdown output — config/roBa.keymap</span>
        <button
          onClick={handleCopy}
          style={{
            padding:'4px 10px', background: copied ? '#14532d' : '#1e2235',
            border:`1px solid ${copied?'#16a34a':'#2d3148'}`, borderRadius:'4px',
            color: copied ? '#4ade80' : '#c8d0e0', fontSize:'10px', cursor:'pointer',
            fontFamily:'Inter', transition:'all 0.15s',
          }}
        >
          {copied ? 'Copied!' : 'Copy Markdown'}
        </button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'10px' }}>
        <pre style={{
          margin:0, padding:'12px', background:'#0a0c14', border:'1px solid #1f2235',
          borderRadius:'4px', fontSize:'10px', lineHeight:1.7,
          fontFamily:'JetBrains Mono, monospace', color:'#c8d0e0',
          whiteSpace:'pre-wrap', wordBreak:'break-word',
        }}>{md}</pre>
      </div>
    </div>
  );
}

Object.assign(window, { BindingsTab, CombosTab, MacrosTab, SensorsTab, MarkdownTab });
