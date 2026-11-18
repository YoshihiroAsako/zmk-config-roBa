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
  if (value === "&bootloader") return fallback("BOOT", "bootloader", value, "studio-direct");

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
      editability: "studio-direct",
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

const MODIFIER_SHORT = {
  LEFT_SHIFT: "LSFT", LSHIFT: "LSFT", LSHFT: "LSFT", RIGHT_SHIFT: "RSFT", RSHIFT: "RSFT", RSHFT: "RSFT",
  LEFT_CONTROL: "LCTL", LCTRL: "LCTL", LCTL: "LCTL", RIGHT_CONTROL: "RCTL", RCTRL: "RCTL", RCTL: "RCTL",
  LEFT_ALT: "LALT", LALT: "LALT", RIGHT_ALT: "RALT", RALT: "RALT",
  LEFT_GUI: "LWIN", LGUI: "LWIN", LEFT_WIN: "LWIN", LWIN: "LWIN", LEFT_COMMAND: "LCMD", LCMD: "LCMD",
  RIGHT_GUI: "RWIN", RGUI: "RWIN", RIGHT_WIN: "RWIN", RWIN: "RWIN", RIGHT_COMMAND: "RCMD", RCMD: "RCMD",
};

/** キーボード図のキー表面に出す 2 段の文字と、色分け用の種類を返す。 */
export function describeKeyFace(raw, layerNames = []) {
  const parsed = describeBinding(raw, layerNames);
  const layerName = (index) => layerNames[Number(index)] || `L${index}`;
  switch (parsed.kind) {
    case "keypress":
      if (MODIFIER_SHORT[parsed.params[0]]) return { top: MODIFIER_SHORT[parsed.params[0]], bottom: "", tone: "modifier" };
      return { top: parsed.params[0] === "QMARK" ? "?" : parsed.display, bottom: "", tone: "key" };
    case "mod-tap":
      return { top: parsed.display, bottom: MODIFIER_SHORT[parsed.params[0]] || parsed.params[0], tone: "hold-modifier" };
    case "layer-tap":
      return { top: displayKeycode(parsed.params[1]), bottom: layerName(parsed.params[0]), tone: "layer" };
    case "momentary":
      return { top: layerName(parsed.params[0]), bottom: "押す間", tone: "layer" };
    case "mouse-button":
      return { top: parsed.display, bottom: "マウス", tone: "mouse" };
    case "bluetooth":
      return { top: parsed.display, bottom: "BT", tone: "system" };
    case "bootloader":
      return { top: "BOOT", bottom: "書込", tone: "system" };
    case "macro":
      return { top: parsed.display, bottom: "→L0", tone: "layer" };
    case "transparent":
      return { top: "", bottom: "透過", tone: "transparent" };
    case "none":
      return { top: "—", bottom: "無効", tone: "none" };
    default: {
      const to = /^&(to|tog|sl) (\d+)$/.exec(parsed.raw || "");
      if (to) return { top: layerName(to[2]), bottom: { to: "切替", tog: "切替/戻", sl: "1回" }[to[1]], tone: "layer" };
      return { top: parsed.display, bottom: parsed.behavior.replace("&", ""), tone: "custom" };
    }
  }
}

// Windows 日本語配列でも US 配列と同じ文字が出るキー(Shift 位置が変わらないもの)。
const SAME_AS_US = {
  "!": "EXCLAMATION", "#": "HASH", "$": "DOLLAR", "%": "PERCENT", "-": "MINUS", "/": "SLASH",
  ",": "COMMA", ".": "DOT", ";": "SEMICOLON", "?": "QMARK", "<": "LESS_THAN", ">": "GREATER_THAN",
};

function jisKeycode(code) {
  return code.replace(/^LS_INT_RO$/, "LS(INT_RO)").replace(/^LS_INT_YEN$/, "LS(INT_YEN)");
}

/**
 * Windows 日本語配列で char を入力する割り当てを返す。
 * 全角の英数記号は半角として扱う。未検証の記号は返さない。
 */
export function findBindingsForCharacter(input) {
  const char = [...String(input ?? "").trim()].length === 1
    ? String(input).trim().replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace("￥", "¥")
    : "";
  if (!char) return [];
  const results = [];
  for (const [code, output] of Object.entries(WINDOWS_JIS_OUTPUT)) {
    if (output === char || (char === "¥" && output === "\\")) {
      const keycode = jisKeycode(code);
      results.push({ keycode, binding: `&kp ${keycode}`, note: "Windows 日本語配列での出力（検証シートの対応表）" });
    }
  }
  if (SAME_AS_US[char]) {
    results.push({ keycode: SAME_AS_US[char], binding: `&kp ${SAME_AS_US[char]}`, note: "US 配列と同じ文字" });
  }
  if (/^[a-z]$/i.test(char)) {
    const keycode = char.toUpperCase();
    results.push({ keycode, binding: `&kp ${keycode}`, note: "英字" });
  }
  if (/^[0-9]$/.test(char)) {
    results.push({ keycode: `N${char}`, binding: `&kp N${char}`, note: "数字" });
  }
  return results;
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
