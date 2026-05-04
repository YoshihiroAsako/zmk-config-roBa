// KeyDetail panel - selected key info (enhanced)
const { useState: useKDState } = React;

function Badge({ children, color, bg }) {
  return (
    <span style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: '3px',
      fontSize: '10px', fontFamily: 'JetBrains Mono, monospace',
      color: color || '#9ca3af', background: bg || 'rgba(156,163,175,0.1)',
      lineHeight: '18px', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function InfoRow({ label, value, mono, highlight, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '4px 0', borderBottom: '1px solid #1a1d2e' }}>
      <span style={{ fontSize: '9px', color: '#4b5563', minWidth: '78px', flexShrink: 0, paddingTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</span>
      {children || (
        <span style={{ fontSize: '11px', color: highlight || '#c8d0e0', fontFamily: mono ? 'JetBrains Mono, monospace' : 'Inter, sans-serif', wordBreak: 'break-all', flex: 1 }}>
          {value}
        </span>
      )}
    </div>
  );
}

function EditabilityInfo({ editability }) {
  const map = {
    'studio-direct':  { label: 'Studio direct',  color: 'oklch(0.65 0.18 240)', desc: 'Can be changed via ZMK Studio without firmware rebuild' },
    'build-required': { label: 'Build required',  color: 'oklch(0.75 0.15 65)',  desc: 'Requires firmware rebuild + flash to change' },
    'source-only':    { label: 'Source only',     color: 'oklch(0.60 0.18 20)',  desc: 'Read from .keymap only — not editable via Studio' },
  };
  const info = map[editability] || { label: editability, color: '#6b7280', desc: '' };
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: info.color, display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontSize: '11px', color: info.color, fontWeight: 600 }}>{info.label}</span>
      </div>
      <div style={{ fontSize: '10px', color: '#4b5563', paddingLeft: '13px', lineHeight: 1.5 }}>{info.desc}</div>
    </div>
  );
}

// Kind-specific detail block
function BindingDetail({ p, rawBinding }) {
  const kindColors = {
    'keypress':     { c: 'oklch(0.65 0.18 240)', bg: 'rgba(59,130,246,0.08)' },
    'mod-tap':      { c: 'oklch(0.70 0.18 290)', bg: 'rgba(139,92,246,0.08)' },
    'layer-tap':    { c: 'oklch(0.70 0.18 160)', bg: 'rgba(52,211,153,0.08)' },
    'momentary':    { c: 'oklch(0.70 0.18 160)', bg: 'rgba(52,211,153,0.08)' },
    'transparent':  { c: '#374151',               bg: 'transparent' },
    'mouse-btn':    { c: 'oklch(0.75 0.15 65)',   bg: 'rgba(251,146,60,0.08)' },
    'mouse-move':   { c: 'oklch(0.75 0.15 65)',   bg: 'rgba(251,146,60,0.08)' },
    'bluetooth':    { c: 'oklch(0.70 0.18 310)',  bg: 'rgba(232,121,249,0.08)' },
    'custom':       { c: '#9ca3af',               bg: 'rgba(156,163,175,0.08)' },
  };
  const { c, bg } = kindColors[p.kind] || { c: '#9ca3af', bg: 'transparent' };

  if (p.kind === 'mod-tap' && p.params?.length >= 2) {
    return (
      <div style={{ padding: '8px', background: bg, border: `1px solid ${c}22`, borderRadius: '4px', marginTop: '6px' }}>
        <div style={{ fontSize: '9px', color: c, fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hold / Tap</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1, background: '#161928', borderRadius: '3px', padding: '4px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px' }}>HOLD</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', fontFamily: 'JetBrains Mono' }}>{p.params[0]}</div>
          </div>
          <div style={{ flex: 1, background: '#161928', borderRadius: '3px', padding: '4px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px' }}>TAP</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', fontFamily: 'JetBrains Mono' }}>{p.params[1]}</div>
          </div>
        </div>
      </div>
    );
  }

  if ((p.kind === 'layer-tap' || p.kind === 'momentary') && p.params?.length >= 1) {
    const layerNames = window.ROBA_DATA.LAYER_NAMES;
    const layerIdx = parseInt(p.params[0]);
    return (
      <div style={{ padding: '8px', background: bg, border: `1px solid ${c}22`, borderRadius: '4px', marginTop: '6px' }}>
        <div style={{ fontSize: '9px', color: c, fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.kind}</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ background: '#161928', borderRadius: '3px', padding: '4px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px' }}>LAYER</div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: c, fontFamily: 'JetBrains Mono' }}>{layerIdx}: {layerNames[layerIdx] || `layer_${layerIdx}`}</div>
          </div>
          {p.params[1] && (
            <div style={{ background: '#161928', borderRadius: '3px', padding: '4px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px' }}>TAP</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#e2e8f0', fontFamily: 'JetBrains Mono' }}>{p.params[1]}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (p.kind === 'bluetooth') {
    return (
      <div style={{ padding: '8px', background: bg, border: `1px solid ${c}22`, borderRadius: '4px', marginTop: '6px' }}>
        <div style={{ fontSize: '9px', color: c, fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bluetooth</div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#e2e8f0' }}>{p.params?.join(' ')}</div>
      </div>
    );
  }

  return null;
}

function KeyDetail({ selectedKey, selectedParsed, layerName, layerIndex }) {
  if (!selectedKey) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#2d3148', fontSize: '11px', gap: '6px' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2d3148" strokeWidth="1.5">
          <rect x="2" y="6" width="20" height="13" rx="3"/>
          <path d="M6 10h2M10 10h4M16 10h2M6 14h12"/>
        </svg>
        Select a key
      </div>
    );
  }

  const p = selectedParsed;
  const rawBinding = (window.ROBA_DATA.LAYER_BINDINGS[layerIndex] || [])[selectedKey.pos] || '&trans';

  return (
    <div style={{ padding: '10px', overflowY: 'auto', flex: 1, fontSize: '11px' }}>
      {/* Large key display */}
      <div style={{ background: '#161928', border: '1px solid #252840', borderRadius: '6px', padding: '10px 8px', marginBottom: '8px', textAlign: 'center' }}>
        <div style={{ fontSize: p.display.length > 4 ? '18px' : '26px', fontFamily: 'Inter, sans-serif', fontWeight: 700, color: p.kind === 'transparent' ? '#2d3148' : '#e2e8f0', lineHeight: 1.2, marginBottom: '5px' }}>
          {p.display}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap' }}>
          <Badge color="oklch(0.65 0.18 240)" bg="rgba(59,130,246,0.1)">{p.kind}</Badge>
          {p.winJis && <Badge color="oklch(0.65 0.18 240)" bg="rgba(59,130,246,0.15)">JIS: {p.winJis}</Badge>}
          {selectedKey.thumb && <Badge color="#6b7280" bg="rgba(107,114,128,0.1)">thumb</Badge>}
        </div>
      </div>

      {/* Core info rows */}
      <InfoRow label="Layer" value={`${layerIndex}: ${layerName}`} />
      <InfoRow label="Position" value={`#${selectedKey.pos}`} mono />
      <InfoRow label="Coords" value={`x:${selectedKey.x.toFixed(3)} y:${selectedKey.y.toFixed(3)}${selectedKey.r ? ` r:${selectedKey.r}°` : ''}`} mono />
      <InfoRow label="Raw binding" value={rawBinding} mono highlight="#86efac" />
      <InfoRow label="Behavior" value={p.rawShort || '—'} mono />

      {/* Kind-specific detail */}
      <BindingDetail p={p} rawBinding={rawBinding} />

      {/* Note */}
      {p.note && (
        <div style={{ padding: '5px 0', borderTop: '1px solid #1a1d2e', marginTop: '6px' }}>
          <div style={{ fontSize: '10px', color: '#4b5563', lineHeight: 1.5 }}>{p.note}</div>
        </div>
      )}

      {/* Editability */}
      <div style={{ padding: '8px 0', borderTop: '1px solid #1a1d2e', marginTop: '4px' }}>
        <div style={{ fontSize: '9px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '5px' }}>Editability</div>
        <EditabilityInfo editability={p.editability} />
      </div>

      {/* Studio vs Build note */}
      <div style={{ marginTop: '6px', padding: '6px 8px', background: '#0d0f1a', borderRadius: '4px', fontSize: '10px', lineHeight: 1.6 }}>
        {p.editability === 'studio-direct' && <span style={{ color: 'oklch(0.65 0.18 240)' }}>↗ Open ZMK Studio to change this key directly</span>}
        {p.editability === 'build-required' && <span style={{ color: 'oklch(0.75 0.15 65)' }}>⚠ Edit config/roBa.keymap → rebuild firmware</span>}
        {p.editability === 'source-only' && <span style={{ color: 'oklch(0.60 0.18 20)' }}>⊘ Custom behavior — edit source + rebuild</span>}
      </div>

      {/* Windows JIS detail */}
      {p.winJis && (
        <div style={{ padding: '7px 8px', marginTop: '6px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: '4px' }}>
          <div style={{ fontSize: '9px', color: 'oklch(0.65 0.18 240)', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Windows JIS</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '9px', color: '#4b5563' }}>ZMK keycode</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#86efac' }}>{p.params?.[0]}</div>
            </div>
            <div style={{ color: '#374151', fontSize: '14px' }}>→</div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', color: '#4b5563' }}>Win JIS output</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#93c5fd' }}>{p.winJis}</div>
            </div>
          </div>
        </div>
      )}

      {/* Phase 2 edit section */}
      <div style={{ marginTop: '10px', padding: '7px 8px', background: '#0a0c14', border: '1px dashed #1f2235', borderRadius: '4px' }}>
        <div style={{ fontSize: '9px', color: '#374151', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Edit controls
          <Badge color="oklch(0.75 0.15 65)" bg="rgba(245,158,11,0.08)">Phase 2</Badge>
        </div>
        {[
          { label: 'Capture PC Key', title: 'Press a key to capture its ZMK binding' },
          { label: 'Change Binding', title: 'Open binding editor for this key' },
          { label: 'Apply to Firmware', title: 'Write change to config/roBa.keymap and trigger build' },
        ].map(btn => (
          <button key={btn.label} disabled title={btn.title} style={{
            display: 'block', width: '100%', marginBottom: '3px',
            padding: '5px 8px', background: '#13151f', border: '1px solid #1f2235',
            borderRadius: '3px', color: '#2d3148', fontSize: '10px',
            cursor: 'not-allowed', fontFamily: 'Inter, sans-serif', textAlign: 'left',
          }}>{btn.label}</button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { KeyDetail, Badge, InfoRow });
