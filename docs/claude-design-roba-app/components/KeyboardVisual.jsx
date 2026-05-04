// KeyboardVisual component - renders roBa 43-key layout
// Coordinates come directly from config/roBa.json (exact key-unit positions)
// Supports key rotation (r, rx, ry) for thumb cluster keys

const KEY_SIZE = 44; // px per key unit
const UNIT     = KEY_SIZE + 4; // 48px per unit (includes gap)

function getEditabilityColor(editability) {
  switch (editability) {
    case 'studio-direct':  return 'oklch(0.65 0.18 240)';
    case 'build-required': return 'oklch(0.75 0.15 65)';
    case 'source-only':    return 'oklch(0.60 0.18 20)';
    default:               return '#6b7280';
  }
}

function KeyCap({ keyDef, parsed, isSelected, isComboHighlight, onClick }) {
  const w = KEY_SIZE;
  const h = KEY_SIZE;
  const isTransparent = parsed.kind === 'transparent';
  const isThumb       = !!keyDef.thumb;

  // Position in pixels
  const px = keyDef.x * UNIT;
  const py = keyDef.y * UNIT;

  // Build transform: if key has rotation, rotate around (rx,ry) in key-units
  let transform = `translate(${px}, ${py})`;
  if (keyDef.r) {
    const rpx = keyDef.rx * UNIT - px;
    const rpy = keyDef.ry * UNIT - py;
    transform = `translate(${px}, ${py}) rotate(${keyDef.r}, ${rpx}, ${rpy})`;
  }

  let bgColor     = isThumb ? '#1c2038' : '#1e2235';
  let borderColor = isThumb ? '#2d3a52' : '#252840';
  if (isSelected)            { bgColor = '#0d2848'; borderColor = 'oklch(0.65 0.18 240)'; }
  else if (isComboHighlight) { bgColor = '#2a1e08'; borderColor = 'oklch(0.75 0.15 65)'; }
  else if (isTransparent)    { bgColor = '#141624'; borderColor = '#1c1f2e'; }

  const displayText = (() => {
    const d = parsed.display || '';
    if (d.length <= 5) return d;
    return d.slice(0, 4) + '…';
  })();

  const rawShort = (parsed.rawShort || '').replace(/^&/, '');
  const rawText  = rawShort.length > 8 ? rawShort.slice(0, 7) + '…' : rawShort;
  const editColor = isTransparent ? 'transparent' : getEditabilityColor(parsed.editability);
  const fontSize = displayText.length > 4 ? 9 : (displayText.length > 2 ? 11 : 13);

  return (
    <g transform={transform} onClick={() => onClick(keyDef, parsed)} style={{ cursor: 'pointer' }}>
      <rect
        width={w} height={h} rx={5} ry={5}
        fill={bgColor}
        stroke={isSelected ? 'oklch(0.65 0.18 240)' : (isComboHighlight ? 'oklch(0.75 0.15 65)' : borderColor)}
        strokeWidth={isSelected || isComboHighlight ? 1.5 : 1}
      />
      {/* Key top face */}
      {!isTransparent && (
        <rect x={2} y={2} width={w-4} height={h-9} rx={3} ry={3}
          fill={isSelected ? '#1a3a6a' : (isThumb ? '#202440' : '#222540')}
          stroke="none" opacity={0.55}
        />
      )}
      {/* Display label */}
      <text
        x={w/2} y={isTransparent ? h/2+5 : 17}
        fontSize={isTransparent ? 18 : fontSize}
        fontFamily="'Inter', sans-serif"
        fontWeight={isTransparent ? 300 : 600}
        fill={isTransparent ? '#252840' : (isSelected ? '#93c5fd' : '#dde4f0')}
        textAnchor="middle"
        dominantBaseline={isTransparent ? 'middle' : 'auto'}
      >
        {displayText}
      </text>
      {/* Raw behavior label */}
      {!isTransparent && rawText && (
        <text x={w/2} y={h-6} fontSize={7.5}
          fontFamily="'JetBrains Mono', monospace"
          fill={editColor} textAnchor="middle" opacity={0.75}>
          {rawText}
        </text>
      )}
      {/* JIS dot */}
      {parsed.winJis && (
        <circle cx={w-5} cy={5} r={2.5} fill="oklch(0.65 0.18 240)" opacity={0.9} />
      )}
      {/* Position index */}
      <text x={w-3} y={h-3} fontSize={6}
        fontFamily="'JetBrains Mono', monospace"
        fill="#2a2d45" textAnchor="end">
        {keyDef.pos}
      </text>
      {/* Thumb indicator */}
      {isThumb && (
        <rect x={2} y={h-4} width={w-4} height={2} rx={1}
          fill="oklch(0.65 0.18 240)" opacity={0.25} />
      )}
    </g>
  );
}

function KeyboardVisual({ keys, layerBindings, selectedPos, onKeySelect, comboHighlightPositions }) {
  const { parseBinding, TRACKBALL_POS } = window.ROBA_DATA;

  // Compute bounds considering rotated keys
  // For simplicity, use unrotated positions + some padding for rotated thumb keys
  const allX = keys.map(k => k.x);
  const allY = keys.map(k => k.y);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);

  const SVG_W = (maxX - minX) * UNIT + KEY_SIZE;
  const SVG_H = (maxY - minY) * UNIT + KEY_SIZE + 16; // extra for rotated thumb
  const PAD   = 12;

  // Gap line between halves — between x=5.015 and x=7.501
  const gapX = (5.015 + 7.501) / 2 * UNIT;

  // Trackball
  const tb = TRACKBALL_POS;
  const tbX = tb.x * UNIT + KEY_SIZE / 2;
  const tbY = tb.y * UNIT + KEY_SIZE / 2;
  const tbR = tb.r * UNIT;

  return (
    <div style={{ width:'100%', height:'100%', overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <svg
        viewBox={`${minX * UNIT - PAD} ${minY * UNIT - PAD} ${SVG_W + PAD*2} ${SVG_H + PAD*2}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display:'block', width:'100%', flex:1, minWidth:'360px' }}
      >
        {/* Half labels */}
        <text x={(minX + 2.5)*UNIT} y={minY*UNIT - 4}
          fontSize={9} fill="#374151" fontFamily="Inter" textAnchor="middle" fontWeight={500} letterSpacing="0.08em">LEFT</text>
        <text x={(9.5)*UNIT} y={minY*UNIT - 4}
          fontSize={9} fill="#374151" fontFamily="Inter" textAnchor="middle" fontWeight={500} letterSpacing="0.08em">RIGHT</text>

        {/* Split gap indicator */}
        <line x1={gapX} y1={minY*UNIT-4} x2={gapX} y2={(maxY+1)*UNIT}
          stroke="#1c1f2e" strokeWidth={1} strokeDasharray="4 4" />

        {/* Trackball placeholder */}
        <circle cx={tbX} cy={tbY} r={tbR}
          fill="#0f1117" stroke="#1f2338" strokeWidth={1.5} strokeDasharray="5 3" />
        <text x={tbX} y={tbY-6} fontSize={8} fontFamily="JetBrains Mono" fill="#2d3148" textAnchor="middle">trackball</text>
        <text x={tbX} y={tbY+6} fontSize={7} fontFamily="JetBrains Mono" fill="#252840" textAnchor="middle">encoder</text>

        {/* Keys */}
        {keys.map(k => {
          const rawBinding = (layerBindings || [])[k.pos] || '&trans';
          const parsed = parseBinding(rawBinding);
          return (
            <KeyCap
              key={k.pos}
              keyDef={k}
              parsed={parsed}
              isSelected={selectedPos === k.pos}
              isComboHighlight={comboHighlightPositions && comboHighlightPositions.includes(k.pos)}
              onClick={onKeySelect}
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display:'flex', gap:'12px', padding:'2px 8px 4px', alignItems:'center', flexWrap:'wrap', justifyContent:'center', flexShrink:0 }}>
        {[
          { color:'oklch(0.65 0.18 240)', label:'Studio direct' },
          { color:'oklch(0.75 0.15 65)',  label:'Build required' },
          { color:'oklch(0.60 0.18 20)',  label:'Source only' },
          { color:'oklch(0.65 0.18 240)', label:'JIS mapped', dot:true },
        ].map(item => (
          <div key={item.label} style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', color:'#4b5563' }}>
            {item.dot
              ? <span style={{ width:6, height:6, borderRadius:'50%', background:item.color, display:'inline-block' }} />
              : <span style={{ width:14, height:2.5, background:item.color, display:'inline-block', borderRadius:1, opacity:0.8 }} />
            }
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { KeyboardVisual });
