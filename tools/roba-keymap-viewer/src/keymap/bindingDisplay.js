const WINDOWS_JIS_OUTPUT = {
  AT_SIGN: "\"",
  AMPERSAND: "'",
  ASTERISK: "(",
  COLON: "+",
  DOUBLE_QUOTES: "*",
  CARET: "&",
  EQUAL: "^",
  INT_YEN: "\\",
  LEFT_BRACKET: "@",
  LEFT_BRACE: "`",
  LEFT_PARENTHESIS: ")",
  LS_INT_RO: "_",
  LS_INT_YEN: "|",
  PLUS: "~",
  BACKSLASH: "]",
  PIPE: "}",
  RIGHT_BRACE: "{",
  RIGHT_BRACKET: "[",
  SQT: ":",
  UNDERSCORE: "=",
};

const WINDOWS_JIS_UNVERIFIED = {
  RIGHT_PARENTHESIS: "Windows JIS output needs verification; Shift+0 behaves differently on JIS.",
  TILDE: "Windows JIS output needs verification; US grave/tilde may act as Hankaku/Zenkaku or IME toggle.",
};

const KEY_LABELS = {
  BACKSPACE: "BSPC",
  DEL: "DEL",
  DELETE: "DEL",
  ENTER: "ENT",
  ESC: "ESC",
  TAB: "TAB",
  SPACE: "SPC",
  LEFT_SHIFT: "LSFT",
  LEFT_WIN: "LWIN",
  LCTRL: "LCTRL",
  LEFT_CONTROL: "LCTRL",
  LEFT_ALT: "LALT",
  PAGE_UP: "PGUP",
  PAGE_DOWN: "PGDN",
  MINUS: "-",
  SLASH: "/",
  COMMA: ",",
  DOT: ".",
  PERIOD: ".",
  SEMICOLON: ";",
  COLON: ":",
  SQT: "'",
  EXCLAMATION: "!",
  HASH: "#",
  DOLLAR: "$",
  PERCENT: "%",
  ASTERISK: "*",
  AMPERSAND: "&",
  LEFT_PARENTHESIS: "(",
  RIGHT_PARENTHESIS: ")",
  LEFT_BRACKET: "[",
  LEFT_BRACE: "{",
  RIGHT_BRACKET: "]",
  RIGHT_BRACE: "}",
  PLUS: "+",
  TILDE: "~",
  KP_NUMBER_0: "0",
  KP_NUMBER_1: "1",
  KP_NUMBER_2: "2",
  KP_NUMBER_3: "3",
  KP_NUMBER_4: "4",
  KP_NUMBER_5: "5",
  KP_NUMBER_6: "6",
  KP_NUMBER_7: "7",
  KP_NUMBER_8: "8",
  KP_NUMBER_9: "9",
  NUMBER_1: "1",
  NUMBER_2: "2",
  NUMBER_3: "3",
  INT_HENKAN: "HENK",
  INT_MUHENKAN: "MUHN",
  C_VOL_UP: "Vol+",
  C_VOLUME_UP: "Vol+",
  C_VOL_DN: "Vol-",
  C_VOLUME_DOWN: "Vol-",
  C_MUTE: "Mute",
  C_PP: "Play/Pause",
  C_PLAY_PAUSE: "Play/Pause",
  C_PLAY: "Play",
  C_PAUSE: "Pause",
  C_STOP: "Stop",
  C_NEXT: "Next",
  C_PREV: "Prev",
  C_PREVIOUS: "Prev",
  C_FF: "FF",
  C_FAST_FORWARD: "FF",
  C_RW: "Rew",
  C_REWIND: "Rew",
  C_BRI_INC: "Bri+",
  C_BRIGHTNESS_INC: "Bri+",
  C_BRI_UP: "Bri+",
  C_BRI_DEC: "Bri-",
  C_BRIGHTNESS_DEC: "Bri-",
  C_BRI_DN: "Bri-",
};

function normalizeJisKey(key) {
  return key.replace("LS(INT_RO)", "LS_INT_RO").replace("LS(INT_YEN)", "LS_INT_YEN");
}

function displayKeycode(key) {
  return describeKeycode(key).display;
}

function describeKeycode(key) {
  const normalized = normalizeJisKey(key);
  if (WINDOWS_JIS_OUTPUT[normalized]) {
    return {
      display: WINDOWS_JIS_OUTPUT[normalized],
      note: `Windows JIS output: ${WINDOWS_JIS_OUTPUT[normalized]}`,
    };
  }

  const note = WINDOWS_JIS_UNVERIFIED[normalized] || "";
  if (KEY_LABELS[key]) return { display: KEY_LABELS[key], note };

  if (key.includes("(")) {
    const base = key.replace(/[LR][CSAG]\(/g, "").replace(/\)/g, "");
    const modifierLabels = { LC: "C", LS: "S", LA: "A", LG: "G", RC: "RC", RS: "RS", RA: "RA", RG: "RG" };
    const mods = key.match(/[LR][CSAG]\(/g)?.map((modifier) => modifierLabels[modifier.slice(0, 2)]) || [];
    return { display: `${mods.join("+")}+${KEY_LABELS[base] || base}`, note };
  }

  return { display: key.replace(/^KP_NUMBER_/, "").replace(/^NUMBER_/, ""), note };
}

export function describeBinding(raw, layerNames = []) {
  const value = raw?.trim() || "";
  if (!value) return fallback("empty", "unknown", raw);
  if (value === "&trans") return fallback("trans", "transparent", value, "studio-direct");
  if (value === "&none") return fallback("none", "none", value, "studio-direct");
  if (value === "&bootloader") return fallback("BOOT", "bootloader", value, "build-required");

  let match = /^&kp (.+)$/.exec(value);
  if (match) {
    const keycode = match[1];
    const keyInfo = describeKeycode(keycode);
    return {
      raw: value,
      behavior: "&kp",
      params: [keycode],
      kind: "keypress",
      display: keyInfo.display,
      editability: "studio-direct",
      note: keyInfo.note,
    };
  }

  match = /^&mt (\S+) (\S+)$/.exec(value);
  if (match) {
    return {
      raw: value,
      behavior: "&mt",
      params: [match[1], match[2]],
      kind: "mod-tap",
      display: displayKeycode(match[2]),
      editability: "studio-direct",
      note: `hold ${match[1]}, tap ${match[2]}`,
    };
  }

  match = /^&lt (\d+) (\S+)$/.exec(value);
  if (match) {
    const layer = Number(match[1]);
    return {
      raw: value,
      behavior: "&lt",
      params: [match[1], match[2]],
      kind: "layer-tap",
      display: layerNames[layer] || `L${layer}`,
      editability: "studio-direct",
      note: `hold ${layerNames[layer] || `layer ${layer}`}, tap ${match[2]}`,
    };
  }

  match = /^&mo (\d+)$/.exec(value);
  if (match) {
    const layer = Number(match[1]);
    return {
      raw: value,
      behavior: "&mo",
      params: [match[1]],
      kind: "momentary",
      display: layerNames[layer] || `MO${layer}`,
      editability: "studio-direct",
      note: `momentary ${layerNames[layer] || `layer ${layer}`}`,
    };
  }

  match = /^&bt (\S+)(?: (\d+))?$/.exec(value);
  if (match) {
    return {
      raw: value,
      behavior: "&bt",
      params: match[2] ? [match[1], match[2]] : [match[1]],
      kind: "bluetooth",
      display: match[2] ? `BT${match[2]}` : match[1].replace("BT_", "BT "),
      editability: "build-required",
      note: "Bluetooth behavior",
    };
  }

  match = /^&mkp (\S+)$/.exec(value);
  if (match) {
    const labels = { MB1: "LMB", MB2: "RMB", MB3: "MMB", MB4: "Back", MB5: "Fwd" };
    return {
      raw: value,
      behavior: "&mkp",
      params: [match[1]],
      kind: "mouse-button",
      display: labels[match[1]] || match[1],
      editability: "studio-direct",
      note: "Mouse button",
    };
  }

  match = /^&to_layer_0 (\S+)$/.exec(value);
  if (match) {
    return {
      raw: value,
      behavior: "&to_layer_0",
      params: [match[1]],
      kind: "macro",
      display: displayKeycode(match[1]),
      editability: "source-only",
      note: "custom macro: switch to layer 0 then tap key",
    };
  }

  return fallback(value.replace(/^&/, "").slice(0, 10), "custom", value, "source-only");
}

function fallback(display, kind, raw, editability = "unknown") {
  return {
    raw,
    behavior: raw?.split(/\s+/)[0] || "",
    params: [],
    kind,
    display,
    editability,
    note: "",
  };
}
