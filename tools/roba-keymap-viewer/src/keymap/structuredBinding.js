export const STRUCTURED_BEHAVIORS = ["&kp", "&lt", "&mt"];

export const STRUCTURED_BEHAVIOR_LABELS = {
  "&kp": { short: "KP", long: "Key Press" },
  "&lt": { short: "LT", long: "Layer-Tap" },
  "&mt": { short: "MT", long: "Mod-Tap" },
};

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

  return {
    behavior: "&kp",
    layerIndex: 0,
    modifier: HOLD_TAP_MODIFIERS[0].code,
    keycode: "A",
    keypressModifiers: [],
  };
}

export function buildStructuredBinding({ behavior, layerIndex, modifier, keycode, keypressModifiers = [] }, layerCount = 0) {
  if (!STRUCTURED_BEHAVIORS.includes(behavior)) {
    throw new Error("Unsupported behavior.");
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
