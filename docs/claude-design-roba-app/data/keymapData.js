// roBa keymap data — generated from config/roBa.json and config/roBa.keymap
// EXACT coordinates from roBa.json layout, exact bindings from roBa.keymap

const LAYER_NAMES = [
  'default_layer',  // 0
  'FUNCTION',       // 1
  'NUM',            // 2
  'ARROW',          // 3
  'MOUSE',          // 4
  'SCROLL',         // 5
  'layer_6'         // 6
];

// Exact key positions from config/roBa.json
// x,y are in key-units (1 unit = 1 keycap width)
// r = rotation degrees, rx/ry = rotation origin
// Position index matches keymap binding order (row-major, left-to-right)
const ROBA_KEYS_43 = [
  // Row 0 — 10 keys (5L + 5R)
  { pos:  0, hand:'L', x:  0.000, y: 0.616, r:   0 },  // Q
  { pos:  1, hand:'L', x:  1.003, y: 0.247, r:   0 },  // W
  { pos:  2, hand:'L', x:  2.005, y: 0.000, r:   0 },  // E
  { pos:  3, hand:'L', x:  3.008, y: 0.132, r:   0 },  // R
  { pos:  4, hand:'L', x:  4.011, y: 0.263, r:   0 },  // T
  { pos:  5, hand:'R', x:  8.504, y: 0.264, r:   0 },  // Y
  { pos:  6, hand:'R', x:  9.506, y: 0.133, r:   0 },  // U
  { pos:  7, hand:'R', x: 10.509, y: 0.001, r:   0 },  // I
  { pos:  8, hand:'R', x: 11.512, y: 0.248, r:   0 },  // O
  { pos:  9, hand:'R', x: 12.514, y: 0.617, r:   0 },  // P

  // Row 1 — 12 keys (6L + 6R)
  { pos: 10, hand:'L', x:  0.000, y: 1.618, r:   0 },  // A
  { pos: 11, hand:'L', x:  1.003, y: 1.250, r:   0 },  // S
  { pos: 12, hand:'L', x:  2.005, y: 1.003, r:   0 },  // D
  { pos: 13, hand:'L', x:  3.008, y: 1.134, r:   0 },  // F
  { pos: 14, hand:'L', x:  4.011, y: 1.266, r:   0 },  // G
  { pos: 15, hand:'L', x:  5.015, y: 1.504, r:   0 },  // LS(LG(S))
  { pos: 16, hand:'R', x:  7.501, y: 1.505, r:   0 },  // MINUS
  { pos: 17, hand:'R', x:  8.504, y: 1.267, r:   0 },  // H
  { pos: 18, hand:'R', x:  9.506, y: 1.135, r:   0 },  // J
  { pos: 19, hand:'R', x: 10.509, y: 1.004, r:   0 },  // K
  { pos: 20, hand:'R', x: 11.512, y: 1.251, r:   0 },  // L
  { pos: 21, hand:'R', x: 12.514, y: 1.619, r:   0 },  // SQT

  // Row 2 — 12 keys (6L + 6R)
  { pos: 22, hand:'L', x:  0.000, y: 2.621, r:   0 },  // Z (mt LSHIFT)
  { pos: 23, hand:'L', x:  1.003, y: 2.253, r:   0 },  // X
  { pos: 24, hand:'L', x:  2.005, y: 2.005, r:   0 },  // C
  { pos: 25, hand:'L', x:  3.008, y: 2.137, r:   0 },  // V
  { pos: 26, hand:'L', x:  4.011, y: 2.268, r:   0 },  // B
  { pos: 27, hand:'L', x:  5.013, y: 2.507, r:   0 },  // COLON
  { pos: 28, hand:'R', x:  7.501, y: 2.508, r:   0 },  // SEMICOLON
  { pos: 29, hand:'R', x:  8.504, y: 2.269, r:   0 },  // N
  { pos: 30, hand:'R', x:  9.506, y: 2.138, r:   0 },  // M
  { pos: 31, hand:'R', x: 10.509, y: 2.006, r:   0 },  // COMMA
  { pos: 32, hand:'R', x: 11.512, y: 2.254, r:   0 },  // DOT
  { pos: 33, hand:'R', x: 12.514, y: 2.622, r:   0 },  // SLASH

  // Row 3 — 9 keys (6L + 3R) — thumb cluster included
  { pos: 34, hand:'L', x:  0.000, y: 3.624, r:   0 },  // LCTRL
  { pos: 35, hand:'L', x:  1.003, y: 3.255, r:   0 },  // LGUI
  { pos: 36, hand:'L', x:  2.004, y: 3.007, r:   0 },  // MO5
  { pos: 37, hand:'L', x:  3.219, y: 3.525, r:   0,  thumb: true },  // lt_to_layer_0 6 INT_HENKAN
  { pos: 38, hand:'L', x:  4.342, y: 3.617, r:   9,  rx: 4.842, ry: 4.117, thumb: true },  // lt 2 SPACE
  { pos: 39, hand:'L', x:  5.451, y: 3.909, r:  20,  rx: 5.951, ry: 4.409, thumb: true },  // lt_to_layer_0 3 INT_MUHENKAN
  { pos: 40, hand:'R', x:  7.059, y: 3.910, r: -20,  rx: 7.559, ry: 4.410, thumb: true },  // BSPC
  { pos: 41, hand:'R', x:  8.158, y: 3.616, r: -10,  rx: 8.658, ry: 4.116, thumb: true },  // lt 1 ENTER
  { pos: 42, hand:'R', x: 12.514, y: 3.625, r:   0 },  // DEL
];

// Trackball position (right side center, between thumb and main keys)
const TRACKBALL_POS = { x: 10.0, y: 3.8, r: 0.65 }; // center x,y and radius in key-units

// ─── Exact bindings from roBa.keymap ───────────────────────────────────────

const LAYER_BINDINGS = {
  0: [ // default_layer
    // Row 0
    '&kp Q', '&kp W', '&kp E', '&kp R', '&kp T',
    '&kp Y', '&kp U', '&kp I', '&kp O', '&kp P',
    // Row 1
    '&kp A', '&kp S', '&kp D', '&kp F', '&kp G', '&kp LS(LG(S))',
    '&kp MINUS', '&kp H', '&kp J', '&kp K', '&kp L', '&kp SQT',
    // Row 2
    '&mt LEFT_SHIFT Z', '&kp X', '&kp C', '&kp V', '&kp B', '&kp COLON',
    '&kp SEMICOLON', '&kp N', '&kp M', '&kp COMMA', '&kp DOT', '&kp SLASH',
    // Row 3 / thumb
    '&kp LCTRL', '&kp LEFT_WIN', '&mo 5',
    '&lt_to_layer_0 6 INT_HENKAN', '&lt 2 SPACE', '&lt_to_layer_0 3 INT_MUHENKAN',
    '&kp BACKSPACE', '&lt 1 ENTER', '&kp DEL',
  ],
  1: [ // FUNCTION
    '&trans', '&trans', '&trans', '&trans', '&trans',
    '&kp F1', '&kp F2', '&kp F3', '&kp F4', '&kp F5',
    '&trans', '&trans', '&trans', '&trans', '&trans', '&trans',
    '&kp F13', '&kp F6', '&kp F7', '&kp F8', '&kp F9', '&kp F10',
    '&trans', '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&trans', '&trans', '&trans', '&kp F11',
    '&trans', '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&kp F12',
  ],
  2: [ // NUM
    '&kp MINUS', '&kp KP_NUMBER_7', '&kp KP_NUMBER_8', '&kp KP_NUMBER_9', '&kp COLON',
    '&kp EQUAL', '&kp CARET', '&kp PLUS', '&kp ASTERISK', '&kp LEFT_PARENTHESIS',
    '&kp SLASH', '&kp KP_NUMBER_4', '&kp KP_NUMBER_5', '&kp KP_NUMBER_6', '&kp DOUBLE_QUOTES', '&kp LC(LA(KP_NUMBER_0))',
    '&kp LS(INT_RO)', '&kp EXCLAMATION', '&kp LEFT_BRACKET', '&kp HASH', '&kp DOLLAR', '&kp PERCENT',
    '&mt LEFT_SHIFT KP_NUMBER_0', '&kp KP_NUMBER_1', '&kp KP_NUMBER_2', '&kp KP_NUMBER_3', '&kp PERIOD', '&kp UNDERSCORE',
    '&trans', '&kp RIGHT_BRACKET', '&kp BACKSLASH', '&kp RIGHT_BRACE', '&kp PIPE', '&kp INT_YEN',
    '&trans', '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&kp LS(INT_YEN)',
  ],
  3: [ // ARROW
    '&kp MINUS', '&kp PLUS', '&kp CARET', '&kp AMPERSAND', '&kp TILDE',
    '&kp LEFT_PARENTHESIS', '&kp RIGHT_PARENTHESIS', '&kp SLASH', '&kp ASTERISK', '&kp UNDERSCORE',
    '&kp EXCLAMATION', '&kp AT_SIGN', '&kp HASH', '&kp DOLLAR', '&kp PERCENT', '&trans',
    '&trans', '&kp PERIOD', '&kp EQUAL', '&kp LEFT_BRACKET', '&kp RIGHT_BRACKET', '&kp LEFT_BRACE',
    '&kp RIGHT_BRACE', '&kp BACKSLASH', '&kp PIPE', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&trans',
  ],
  4: [ // MOUSE
    '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&mkp MB1', '&mkp MB3', '&mkp MB2', '&trans',
    '&trans', '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&trans',
  ],
  5: [ // SCROLL
    '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&trans',
  ],
  6: [ // layer_6
    '&trans', '&trans', '&trans', '&trans', '&trans',
    '&bt BT_SEL 0', '&bt BT_SEL 1', '&bt BT_SEL 2', '&bt BT_SEL 3', '&bt BT_SEL 4',
    '&trans', '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&kp NUMBER_1', '&kp NUMBER_2', '&kp NUMBER_3', '&trans', '&trans',
    '&bootloader', '&trans', '&trans', '&trans', '&trans', '&bt BT_CLR',
    '&trans', '&trans', '&trans', '&trans', '&trans', '&trans',
    '&trans', '&trans', '&bt BT_CLR_ALL',
  ],
};

// ─── Combos (from roBa.keymap) ──────────────────────────────────────────────
const COMBOS = [
  { name: 'tab',              positions: [11, 12], keys: ['S','D'],       binding: '&kp TAB',              layers: [0], timeout: 50,  status: 'ok' },
  { name: 'shift_tab',        positions: [12, 13], keys: ['D','F'],       binding: '&kp LS(TAB)',          layers: [0], timeout: 50,  status: 'ok' },
  { name: 'muhennkann',       positions: [10, 11], keys: ['A','S'],       binding: '&to_layer_0 INT_MUHENKAN', layers: [0], timeout: 50, status: 'ok' },
  { name: 'double_quotation', positions: [18, 19], keys: ['J','K'],       binding: '&kp AT_SIGN',          layers: [0], timeout: 50,  status: 'ok' },
  { name: 'eq',               positions: [24, 25], keys: ['C','V'],       binding: '&kp UNDERSCORE',       layers: [0], timeout: 50,  status: 'ok' },
];

// ─── Macros ─────────────────────────────────────────────────────────────────
const MACROS = [
  { name: 'to_layer_0', compatible: 'zmk,behavior-macro-one-param', steps: 2, summary: 'Switch to layer 0 then send key param', rawDef: 'bindings = <&to 0 &macro_param_1to1 &kp MACRO_PLACEHOLDER>;', status: 'ok' },
];

// ─── Behaviors ──────────────────────────────────────────────────────────────
const BEHAVIORS = [
  { name: 'lt_to_layer_0', compatible: 'zmk,behavior-hold-tap', bindingCells: 2, uses: 3, rawDef: 'tapping-term-ms = <200>; bindings = <&mo>, <&to_layer_0>;', status: 'ok' },
  { name: 'mt (modified)', compatible: 'zmk,behavior-hold-tap', bindingCells: 2, uses: 1, rawDef: 'flavor = "balanced"; quick-tap-ms = <0>;', status: 'ok' },
  { name: 'trackball',     compatible: 'zmk,trackball',         bindingCells: 0, uses: 1, rawDef: 'automouse-layer = <4>; scroll-layers = <5>;', status: 'ok' },
];

// ─── Sensors ────────────────────────────────────────────────────────────────
const SENSORS = [
  { layer: 'default_layer', sensor: 'left_encoder', rawBinding: '&inc_dec_kp PG_UP PAGE_DOWN', display: 'Page Up / Down' },
  { layer: 'ARROW',         sensor: 'left_encoder', rawBinding: '&inc_dec_kp LC(PAGE_UP) LC(PAGE_DOWN)', display: 'Ctrl+PgUp / Ctrl+PgDn' },
];

// ─── Warnings ───────────────────────────────────────────────────────────────
const WARNINGS = [
  { id: 'w1', level: 'info',    message: 'Read-only mode — config/roBa.keymap is the canonical source', dismissible: false },
  { id: 'w2', level: 'warning', message: 'ZMK Studio direct changes may diverge from repo .keymap', dismissible: true },
  { id: 'w3', level: 'info',    message: 'Sensors: left_encoder enabled=false in .json — availability determined by .keymap sensor-bindings', dismissible: true },
  { id: 'w4', level: 'info',    message: 'Trackball: automouse-layer=4 (MOUSE), scroll-layers=5 (SCROLL)', dismissible: true },
];

// ─── Binding parser ──────────────────────────────────────────────────────────
function parseBinding(raw) {
  if (!raw) return { display:'?', kind:'unknown', editability:'source-only', params:[], rawShort:'?', winJis:null, note:null };
  const r = raw.trim();

  if (r === '&trans') return { display:'▽', kind:'transparent', editability:'studio-direct', params:[], rawShort:'&trans', winJis:null, note:'Transparent — falls through to lower layer' };
  if (r === '&none')  return { display:'✕', kind:'blocked', editability:'studio-direct', params:[], rawShort:'&none', winJis:null, note:'Blocked — no action' };

  // Custom macros / behaviors
  if (r.startsWith('&lt_to_layer_0')) {
    const m = r.match(/&lt_to_layer_0 (\d+) (\S+)/);
    if (m) return { display: LAYER_NAMES[parseInt(m[1])] || `L${m[1]}`, kind:'layer-tap', editability:'source-only', params:[m[1],m[2]], rawShort:'&lt_to_layer_0', winJis: m[2]==='INT_HENKAN'?'変換': m[2]==='INT_MUHENKAN'?'無変換':null, note:`Hold: Layer${m[1]} / Tap: to_layer_0(${m[2]})` };
  }
  if (r === '&bootloader') return { display:'BOOT', kind:'custom', editability:'build-required', params:[], rawShort:'&bootloader', winJis:null, note:'Enter bootloader mode' };

  const kpMatch = r.match(/^&kp (.+)$/);
  if (kpMatch) {
    const key = kpMatch[1];
    const jisMap = {
      'INT_YEN':'¥','INT_RO':'ろ','INT_HENKAN':'変換','INT_MUHENKAN':'無変換',
      'LANG1':'変換','LANG2':'無変換','LS(INT_YEN)':'‾','LS(INT_RO)':'ろ',
    };
    const dispMap = {
      'LEFT_SHIFT':'⇧','LSFT':'⇧','LEFT_WIN':'⊞','LGUI':'⌘','LEFT_ALT':'⌥','LALT':'⌥',
      'LCTRL':'⌃','LEFT_CONTROL':'⌃','BSPC':'⌫','BACKSPACE':'⌫','DEL':'⌦','DELETE':'⌦',
      'ENTER':'↩','RETURN':'↩','ESC':'ESC','ESCAPE':'ESC','TAB':'TAB','CAPS':'CAPS',
      'SPACE':'SPC','LEFT':'←','RIGHT':'→','UP':'↑','DOWN':'↓',
      'HOME':'Home','END':'End','PAGE_UP':'PgUp','PAGE_DOWN':'PgDn','PGUP':'PgUp','PGDN':'PgDn',
      'SQT':"'", 'DOUBLE_QUOTES':'"', 'COMMA':',','DOT':'.','SLASH':'/','BACKSLASH':'\\',
      'SEMICOLON':';','COLON':':','MINUS':'-','EQUAL':'=','GRAVE':'`','TILDE':'~',
      'LEFT_PARENTHESIS':'(','RIGHT_PARENTHESIS':')','LEFT_BRACKET':'[','RIGHT_BRACKET':']',
      'LEFT_BRACE':'{','RIGHT_BRACE':'}','EXCLAMATION':'!','AT_SIGN':'@','HASH':'#',
      'DOLLAR':'$','PERCENT':'%','CARET':'^','AMPERSAND':'&','ASTERISK':'*',
      'UNDERSCORE':'_','PLUS':'+','PIPE':'|','TILDE':'~','COLON':':',
      'KP_NUMBER_0':'0','KP_NUMBER_1':'1','KP_NUMBER_2':'2','KP_NUMBER_3':'3',
      'KP_NUMBER_4':'4','KP_NUMBER_5':'5','KP_NUMBER_6':'6','KP_NUMBER_7':'7',
      'KP_NUMBER_8':'8','KP_NUMBER_9':'9',
      'NUMBER_1':'1','NUMBER_2':'2','NUMBER_3':'3',
    };
    // Handle modifiers like LS(LG(S))
    if (key.includes('(')) {
      const clean = key.replace(/L[SGC]\(/g,'').replace(/\)/g,'');
      const mods = [];
      if (key.includes('LS(')) mods.push('⇧');
      if (key.includes('LG(')) mods.push('⌘');
      if (key.includes('LC(')) mods.push('⌃');
      if (key.includes('LA(')) mods.push('⌥');
      return { display: mods.join('')+(dispMap[clean]||clean), kind:'keypress', editability:'studio-direct', params:[key], rawShort:'&kp', winJis:null, note:`Modifier combo: ${key}` };
    }
    return { display: jisMap[key]||dispMap[key]||key, kind:'keypress', editability:'studio-direct', params:[key], rawShort:'&kp', winJis:jisMap[key]||null, note:jisMap[key]?`Windows JIS: ${jisMap[key]}`:null };
  }

  const mtMatch = r.match(/^&mt (\S+) (\S+)$/);
  if (mtMatch) {
    const holdDisp = { 'LEFT_SHIFT':'⇧', 'LSFT':'⇧' };
    return { display: mtMatch[2].length>5?mtMatch[2].slice(0,5):mtMatch[2], kind:'mod-tap', editability:'studio-direct', params:[mtMatch[1],mtMatch[2]], rawShort:'&mt', winJis:null, note:`Hold: ${mtMatch[1]} / Tap: ${mtMatch[2]}` };
  }

  const ltMatch = r.match(/^&lt (\d+) (\S+)$/);
  if (ltMatch) {
    const jis = { 'INT_HENKAN':'変換','INT_MUHENKAN':'無変換','SPACE':'SPC' };
    const layerName = LAYER_NAMES[parseInt(ltMatch[1])] || `L${ltMatch[1]}`;
    return { display: layerName, kind:'layer-tap', editability:'studio-direct', params:[ltMatch[1],ltMatch[2]], rawShort:'&lt', winJis:jis[ltMatch[2]]||null, note:`Hold: ${layerName} / Tap: ${ltMatch[2]}` };
  }

  const moMatch = r.match(/^&mo (\d+)$/);
  if (moMatch) return { display: LAYER_NAMES[parseInt(moMatch[1])]||`MO${moMatch[1]}`, kind:'momentary', editability:'studio-direct', params:[moMatch[1]], rawShort:'&mo', winJis:null, note:`Momentary: ${LAYER_NAMES[parseInt(moMatch[1])]}` };

  const mkpMatch = r.match(/^&mkp (\S+)$/);
  if (mkpMatch) { const m={'MB1':'LMB','MB2':'RMB','MB3':'MMB'}; return { display:m[mkpMatch[1]]||mkpMatch[1], kind:'mouse-btn', editability:'build-required', params:[mkpMatch[1]], rawShort:'&mkp', winJis:null, note:'Mouse button — build required' }; }

  const btMatch = r.match(/^&bt (\S+)(?: (\d+))?$/);
  if (btMatch) { const c={'BT_SEL':`BT${btMatch[2]}`,'BT_CLR':'BT CLR','BT_CLR_ALL':'BT CLR ALL','BT_NXT':'BT▶','BT_PRV':'BT◀'}; return { display:c[btMatch[1]]||btMatch[1], kind:'bluetooth', editability:'build-required', params:btMatch[2]?[btMatch[1],btMatch[2]]:[btMatch[1]], rawShort:'&bt', winJis:null, note:'Bluetooth — build required' }; }

  return { display:r.replace(/^&/,'').slice(0,8), kind:'custom', editability:'source-only', params:[], rawShort:r.slice(0,12), winJis:null, note:'Custom binding — source only' };
}

if (typeof window !== 'undefined') {
  window.ROBA_DATA = { LAYER_NAMES, ROBA_KEYS_43, TRACKBALL_POS, LAYER_BINDINGS, COMBOS, MACROS, BEHAVIORS, SENSORS, WARNINGS, parseBinding };
}
