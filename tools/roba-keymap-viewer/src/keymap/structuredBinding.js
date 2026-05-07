export const STRUCTURED_BEHAVIORS = ["&kp", "&lt", "&mt", "&mkp", "&bt", "&bootloader"];

export const STRUCTURED_BEHAVIOR_LABELS = {
  "&kp": { short: "KP", long: "Key Press" },
  "&lt": { short: "LT", long: "Layer-Tap" },
  "&mt": { short: "MT", long: "Mod-Tap" },
  "&mkp": { short: "MKP", long: "Mouse Button Press" },
  "&bt": { short: "BT", long: "Bluetooth" },
  "&bootloader": { short: "BOOT", long: "Bootloader" },
};

export const BT_COMMANDS = [
  { id: "BT_SEL 0", label: "Select Profile 0 (BT_SEL 0)" },
  { id: "BT_SEL 1", label: "Select Profile 1 (BT_SEL 1)" },
  { id: "BT_SEL 2", label: "Select Profile 2 (BT_SEL 2)" },
  { id: "BT_SEL 3", label: "Select Profile 3 (BT_SEL 3)" },
  { id: "BT_SEL 4", label: "Select Profile 4 (BT_SEL 4)" },
  { id: "BT_CLR",     label: "Clear Current Pairing (BT_CLR)" },
  { id: "BT_CLR_ALL", label: "Clear All Pairings (BT_CLR_ALL)" },
  { id: "BT_PRV",     label: "Previous Profile (BT_PRV)" },
  { id: "BT_NXT",     label: "Next Profile (BT_NXT)" },
  { id: "BT_DISC 0", label: "Disconnect Profile 0 (BT_DISC 0)" },
  { id: "BT_DISC 1", label: "Disconnect Profile 1 (BT_DISC 1)" },
  { id: "BT_DISC 2", label: "Disconnect Profile 2 (BT_DISC 2)" },
  { id: "BT_DISC 3", label: "Disconnect Profile 3 (BT_DISC 3)" },
  { id: "BT_DISC 4", label: "Disconnect Profile 4 (BT_DISC 4)" },
];

export const MOUSE_BUTTONS = [
  { code: "MB1", label: "Left (MB1)" },
  { code: "MB2", label: "Right (MB2)" },
  { code: "MB3", label: "Middle (MB3)" },
  { code: "MB4", label: "Back (MB4)" },
  { code: "MB5", label: "Forward (MB5)" },
];

export const KEY_PRESS_MODIFIERS = [
  { code: "LC", label: "L Ctrl" },
  { code: "LS", label: "L Shift" },
  { code: "LA", label: "L Alt" },
  { code: "LG", label: "L GUI" },
  { code: "RC", label: "R Ctrl" },
  { code: "RS", label: "R Shift" },
  { code: "RA", label: "R Alt" },
  { code: "RG", label: "R GUI" },
];

export const HOLD_TAP_MODIFIERS = [
  { code: "LEFT_SHIFT", label: "L Shift" },
  { code: "RIGHT_SHIFT", label: "R Shift" },
  { code: "LEFT_CONTROL", label: "L Ctrl" },
  { code: "RIGHT_CONTROL", label: "R Ctrl" },
  { code: "LEFT_ALT", label: "L Alt" },
  { code: "RIGHT_ALT", label: "R Alt" },
  { code: "LEFT_GUI", label: "L Win" },
  { code: "RIGHT_GUI", label: "R Win" },
];

export function parseStructuredBinding(raw, layerCount = 0) {
  const value = String(raw ?? "").trim();
  let match = /^&lt (\d+) (\S+)$/.exec(value);
  if (match) {
    const layer = Number(match[1]);
    const parsedKeypress = parseKeypressValue(match[2]);
    return {
      behavior: "&lt",
      layerIndex: Number.isInteger(layer) ? clampLayer(layer, layerCount) : 0,
      modifier: HOLD_TAP_MODIFIERS[0].code,
      keycode: parsedKeypress.keycode,
      keypressModifiers: parsedKeypress.modifiers,
    };
  }

  match = /^&mt (\S+) (\S+)$/.exec(value);
  if (match) {
    const parsedKeypress = parseKeypressValue(match[2]);
    return {
      behavior: "&mt",
      layerIndex: 0,
      modifier: match[1],
      keycode: parsedKeypress.keycode,
      keypressModifiers: parsedKeypress.modifiers,
    };
  }

  match = /^&kp (\S+)$/.exec(value);
  if (match) {
    const parsedKeypress = parseKeypressValue(match[1]);
    return {
      behavior: "&kp",
      layerIndex: 0,
      modifier: HOLD_TAP_MODIFIERS[0].code,
      keycode: parsedKeypress.keycode,
      keypressModifiers: parsedKeypress.modifiers,
    };
  }

  match = /^&mkp (\S+)$/.exec(value);
  if (match) {
    const button = MOUSE_BUTTONS.some((b) => b.code === match[1]) ? match[1] : "MB1";
    return {
      behavior: "&mkp",
      mouseButton: button,
      layerIndex: 0,
      modifier: HOLD_TAP_MODIFIERS[0].code,
      keycode: "A",
      keypressModifiers: [],
    };
  }

  match = /^&bt (\S+)(?: (\d+))?$/.exec(value);
  if (match) {
    const cmd = match[2] !== undefined ? `${match[1]} ${match[2]}` : match[1];
    const btCommand = BT_COMMANDS.some((c) => c.id === cmd) ? cmd : BT_COMMANDS[0].id;
    return {
      behavior: "&bt",
      btCommand,
      layerIndex: 0,
      modifier: HOLD_TAP_MODIFIERS[0].code,
      keycode: "A",
      keypressModifiers: [],
    };
  }

  if (value === "&bootloader") {
    return {
      behavior: "&bootloader",
      layerIndex: 0,
      modifier: HOLD_TAP_MODIFIERS[0].code,
      keycode: "A",
      keypressModifiers: [],
    };
  }

  return {
    behavior: "&kp",
    layerIndex: 0,
    modifier: HOLD_TAP_MODIFIERS[0].code,
    keycode: "A",
    keypressModifiers: [],
  };
}

export function buildStructuredBinding({ behavior, layerIndex, modifier, keycode, keypressModifiers = [], mouseButton = "MB1", btCommand = BT_COMMANDS[0].id }, layerCount = 0) {
  if (!STRUCTURED_BEHAVIORS.includes(behavior)) {
    throw new Error("Unsupported behavior.");
  }

  if (behavior === "&bootloader") {
    return "&bootloader";
  }

  if (behavior === "&bt") {
    if (!BT_COMMANDS.some((c) => c.id === btCommand)) {
      throw new Error("Invalid BT command.");
    }
    return `&bt ${btCommand}`;
  }

  if (behavior === "&mkp") {
    if (!MOUSE_BUTTONS.some((b) => b.code === mouseButton)) {
      throw new Error("Invalid mouse button.");
    }
    return `&mkp ${mouseButton}`;
  }

  validateToken(keycode, "Keycode");

  if (behavior === "&kp") return `&kp ${buildKeypressValue(keycode, keypressModifiers)}`;

  if (behavior === "&lt") {
    if (!Number.isInteger(layerIndex)) {
      throw new Error("Layer index must be an integer.");
    }
    if (layerIndex < 0 || (layerCount > 0 && layerIndex >= layerCount)) {
      throw new Error(`Layer index must be between 0 and ${Math.max(layerCount - 1, 0)}.`);
    }
    return `&lt ${layerIndex} ${buildKeypressValue(keycode, keypressModifiers)}`;
  }

  validateToken(modifier, "Modifier");
  return `&mt ${modifier} ${buildKeypressValue(keycode, keypressModifiers)}`;
}

export function validateStructuredBinding(draft, layerCount = 0) {
  try {
    return { ok: true, binding: buildStructuredBinding(draft, layerCount), message: "" };
  } catch (error) {
    return { ok: false, binding: "", message: error.message };
  }
}

function validateToken(value, label) {
  if (!value || String(value).trim() !== String(value)) {
    throw new Error(`${label} is required and must not start or end with spaces.`);
  }
  if (/[<>&;\s]/.test(value)) {
    throw new Error(`${label} contains unsupported characters.`);
  }
}

function clampLayer(layer, layerCount) {
  if (layerCount <= 0) return Math.max(0, layer);
  return Math.min(Math.max(0, layer), layerCount - 1);
}

function parseKeypressValue(value) {
  const modifiers = [];
  let current = value;

  while (true) {
    const match = /^([LR][CSAG])\((.+)\)$/.exec(current);
    if (!match || !KEY_PRESS_MODIFIERS.some((modifier) => modifier.code === match[1])) break;
    modifiers.push(match[1]);
    current = match[2];
  }

  return {
    keycode: current,
    modifiers: sortKeypressModifiers(modifiers),
  };
}

function buildKeypressValue(keycode, modifiers) {
  const selected = sortKeypressModifiers(modifiers);
  let value = keycode;
  for (let index = selected.length - 1; index >= 0; index -= 1) {
    value = `${selected[index]}(${value})`;
  }
  return value;
}

function sortKeypressModifiers(modifiers) {
  const order = new Map(KEY_PRESS_MODIFIERS.map((modifier, index) => [modifier.code, index]));
  return [...new Set(modifiers)]
    .filter((modifier) => order.has(modifier))
    .sort((left, right) => order.get(left) - order.get(right));
}
