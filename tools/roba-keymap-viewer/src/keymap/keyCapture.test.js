import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { captureKeyToBinding } from "./keyCapture.js";

function ev(overrides = {}) {
  return {
    code: "",
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false,
    ...overrides,
  };
}

describe("captureKeyToBinding", () => {
  describe("letters A-Z", () => {
    const cases = [
      ["KeyA", "&kp A"],
      ["KeyB", "&kp B"],
      ["KeyM", "&kp M"],
      ["KeyZ", "&kp Z"],
    ];
    for (const [code, expected] of cases) {
      test(`${code} → ${expected}`, () => {
        assert.deepEqual(captureKeyToBinding(ev({ code })), { binding: expected });
      });
    }
  });

  describe("digits 0-9", () => {
    const cases = [
      ["Digit0", "&kp N0"],
      ["Digit1", "&kp N1"],
      ["Digit9", "&kp N9"],
    ];
    for (const [code, expected] of cases) {
      test(`${code} → ${expected}`, () => {
        assert.deepEqual(captureKeyToBinding(ev({ code })), { binding: expected });
      });
    }
  });

  describe("control keys", () => {
    const cases = [
      ["Enter", "&kp ENTER"],
      ["Tab", "&kp TAB"],
      ["Space", "&kp SPACE"],
      ["Backspace", "&kp BACKSPACE"],
      ["Delete", "&kp DEL"],
      ["ArrowLeft", "&kp LEFT_ARROW"],
      ["ArrowRight", "&kp RIGHT_ARROW"],
      ["ArrowUp", "&kp UP_ARROW"],
      ["ArrowDown", "&kp DOWN_ARROW"],
    ];
    for (const [code, expected] of cases) {
      test(`${code} → ${expected}`, () => {
        assert.deepEqual(captureKeyToBinding(ev({ code })), { binding: expected });
      });
    }
  });

  describe("Escape", () => {
    test("Escape → cancelled", () => {
      assert.deepEqual(captureKeyToBinding(ev({ code: "Escape" })), { cancelled: true });
    });
  });

  describe("ignored events", () => {
    test("repeat → ignored", () => {
      assert.deepEqual(captureKeyToBinding(ev({ code: "KeyA", repeat: true })), { ignored: true });
    });

    test("isComposing → ignored", () => {
      assert.deepEqual(captureKeyToBinding(ev({ code: "KeyA", isComposing: true })), { ignored: true });
    });

    test("ctrlKey → ignored", () => {
      assert.deepEqual(captureKeyToBinding(ev({ code: "KeyA", ctrlKey: true })), { ignored: true });
    });

    test("altKey → ignored", () => {
      assert.deepEqual(captureKeyToBinding(ev({ code: "KeyA", altKey: true })), { ignored: true });
    });

    test("metaKey → ignored", () => {
      assert.deepEqual(captureKeyToBinding(ev({ code: "KeyA", metaKey: true })), { ignored: true });
    });
  });

  describe("unsupported keys", () => {
    const unsupportedCodes = ["F1", "F12", "ShiftLeft", "ShiftRight", "CapsLock", "NumpadAdd", "IntlYen"];
    for (const code of unsupportedCodes) {
      test(`${code} → unsupported`, () => {
        const result = captureKeyToBinding(ev({ code }));
        assert.equal(result.unsupported, true);
        assert.equal(result.reason, code);
      });
    }
  });

  describe("shift does not suppress supported keys", () => {
    test("Shift+A still maps to &kp A (shift is not Ctrl/Alt/Meta)", () => {
      assert.deepEqual(captureKeyToBinding(ev({ code: "KeyA", shiftKey: true })), { binding: "&kp A" });
    });
  });

  describe("Escape always cancels regardless of modifiers", () => {
    test("Escape before repeat/modifier check", () => {
      assert.deepEqual(captureKeyToBinding(ev({ code: "Escape", shiftKey: true })), { cancelled: true });
    });
  });
});
