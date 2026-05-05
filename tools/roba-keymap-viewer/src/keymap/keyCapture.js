const CODE_TO_ZMK = {
  KeyA: "A", KeyB: "B", KeyC: "C", KeyD: "D", KeyE: "E",
  KeyF: "F", KeyG: "G", KeyH: "H", KeyI: "I", KeyJ: "J",
  KeyK: "K", KeyL: "L", KeyM: "M", KeyN: "N", KeyO: "O",
  KeyP: "P", KeyQ: "Q", KeyR: "R", KeyS: "S", KeyT: "T",
  KeyU: "U", KeyV: "V", KeyW: "W", KeyX: "X", KeyY: "Y",
  KeyZ: "Z",
  Digit0: "N0", Digit1: "N1", Digit2: "N2", Digit3: "N3", Digit4: "N4",
  Digit5: "N5", Digit6: "N6", Digit7: "N7", Digit8: "N8", Digit9: "N9",
  Enter: "ENTER",
  Tab: "TAB",
  Space: "SPACE",
  Backspace: "BACKSPACE",
  Delete: "DEL",
  ArrowLeft: "LEFT_ARROW",
  ArrowRight: "RIGHT_ARROW",
  ArrowUp: "UP_ARROW",
  ArrowDown: "DOWN_ARROW",
};

/**
 * Convert a keyboard event descriptor to a &kp binding.
 * Accepts a plain object rather than a DOM KeyboardEvent for testability.
 *
 * @param {{ code: string, ctrlKey: boolean, altKey: boolean, metaKey: boolean, repeat: boolean, isComposing: boolean }} event
 * @returns {{ binding: string } | { cancelled: true } | { ignored: true } | { unsupported: true, reason: string }}
 */
export function captureKeyToBinding({ code, ctrlKey, altKey, metaKey, repeat, isComposing }) {
  if (code === "Escape") return { cancelled: true };
  if (repeat || isComposing) return { ignored: true };
  if (ctrlKey || altKey || metaKey) return { ignored: true };
  const zmkCode = CODE_TO_ZMK[code];
  if (!zmkCode) return { unsupported: true, reason: code };
  return { binding: `&kp ${zmkCode}` };
}
