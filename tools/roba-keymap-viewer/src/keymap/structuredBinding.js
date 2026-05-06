export const STRUCTURED_BEHAVIORS = ["&kp", "&lt", "&mt"];

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
    return {
      behavior: "&lt",
      layerIndex: Number.isInteger(layer) ? clampLayer(layer, layerCount) : 0,
      modifier: HOLD_TAP_MODIFIERS[0].code,
      keycode: match[2],
    };
  }

  match = /^&mt (\S+) (\S+)$/.exec(value);
  if (match) {
    return {
      behavior: "&mt",
      layerIndex: 0,
      modifier: match[1],
      keycode: match[2],
    };
  }

  match = /^&kp (\S+)$/.exec(value);
  if (match) {
    return {
      behavior: "&kp",
      layerIndex: 0,
      modifier: HOLD_TAP_MODIFIERS[0].code,
      keycode: match[1],
    };
  }

  return {
    behavior: "&kp",
    layerIndex: 0,
    modifier: HOLD_TAP_MODIFIERS[0].code,
    keycode: "A",
  };
}

export function buildStructuredBinding({ behavior, layerIndex, modifier, keycode }, layerCount = 0) {
  if (!STRUCTURED_BEHAVIORS.includes(behavior)) {
    throw new Error("Unsupported behavior.");
  }
  validateToken(keycode, "Keycode");

  if (behavior === "&kp") return `&kp ${keycode}`;

  if (behavior === "&lt") {
    if (!Number.isInteger(layerIndex)) {
      throw new Error("Layer index must be an integer.");
    }
    if (layerIndex < 0 || (layerCount > 0 && layerIndex >= layerCount)) {
      throw new Error(`Layer index must be between 0 and ${Math.max(layerCount - 1, 0)}.`);
    }
    return `&lt ${layerIndex} ${keycode}`;
  }

  validateToken(modifier, "Modifier");
  return `&mt ${modifier} ${keycode}`;
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
