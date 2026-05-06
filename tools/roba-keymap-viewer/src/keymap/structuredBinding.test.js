import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  KEY_PRESS_MODIFIERS,
  buildStructuredBinding,
  parseStructuredBinding,
  validateStructuredBinding,
} from "./structuredBinding.js";

describe("structured binding helpers", () => {
  it("builds keypress, layer-tap, and mod-tap bindings", () => {
    assert.equal(
      buildStructuredBinding({ behavior: "&kp", keycode: "A" }, 7),
      "&kp A",
    );
    assert.equal(
      buildStructuredBinding({ behavior: "&kp", keycode: "PSCRN", keypressModifiers: ["LS"] }, 7),
      "&kp LS(PSCRN)",
    );
    assert.equal(
      buildStructuredBinding({ behavior: "&kp", keycode: "PSCRN", keypressModifiers: ["LS", "LC"] }, 7),
      "&kp LC(LS(PSCRN))",
    );
    assert.equal(
      buildStructuredBinding({ behavior: "&lt", layerIndex: 2, keycode: "TAB" }, 7),
      "&lt 2 TAB",
    );
    assert.equal(
      buildStructuredBinding({ behavior: "&mt", modifier: "LEFT_SHIFT", keycode: "SPACE" }, 7),
      "&mt LEFT_SHIFT SPACE",
    );
  });

  it("parses existing editable hold-tap bindings for the picker draft", () => {
    assert.deepEqual(parseStructuredBinding("&kp PSCRN", 7), {
      behavior: "&kp",
      layerIndex: 0,
      modifier: "LEFT_SHIFT",
      keycode: "PSCRN",
      keypressModifiers: [],
    });
    assert.deepEqual(parseStructuredBinding("&kp LS(PSCRN)", 7), {
      behavior: "&kp",
      layerIndex: 0,
      modifier: "LEFT_SHIFT",
      keycode: "PSCRN",
      keypressModifiers: ["LS"],
    });
    assert.deepEqual(parseStructuredBinding("&kp LC(LS(PSCRN))", 7), {
      behavior: "&kp",
      layerIndex: 0,
      modifier: "LEFT_SHIFT",
      keycode: "PSCRN",
      keypressModifiers: ["LC", "LS"],
    });
    assert.deepEqual(parseStructuredBinding("&lt 6 ESCAPE", 7), {
      behavior: "&lt",
      layerIndex: 6,
      modifier: "LEFT_SHIFT",
      keycode: "ESCAPE",
    });
    assert.deepEqual(parseStructuredBinding("&mt RIGHT_ALT INT_YEN", 7), {
      behavior: "&mt",
      layerIndex: 0,
      modifier: "RIGHT_ALT",
      keycode: "INT_YEN",
    });
  });

  it("rejects unsupported token characters before preview/save", () => {
    assert.equal(validateStructuredBinding({ behavior: "&kp", keycode: "A B" }, 7).ok, false);
    assert.equal(validateStructuredBinding({ behavior: "&lt", layerIndex: 7, keycode: "A" }, 7).ok, false);
    assert.equal(validateStructuredBinding({ behavior: "&mt", modifier: "LEFT_SHIFT", keycode: "A" }, 7).ok, true);
  });

  it("round-trips all keypress modifier toggles in stable order", () => {
    const reversedModifiers = [...KEY_PRESS_MODIFIERS.map((modifier) => modifier.code)].reverse();
    const binding = buildStructuredBinding({
      behavior: "&kp",
      keycode: "TAB",
      keypressModifiers: reversedModifiers,
    });

    assert.equal(binding, "&kp LC(LS(LA(LG(RC(RS(RA(RG(TAB))))))))");
    assert.deepEqual(parseStructuredBinding(binding).keypressModifiers, KEY_PRESS_MODIFIERS.map((modifier) => modifier.code));
  });
});
