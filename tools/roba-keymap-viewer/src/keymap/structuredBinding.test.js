import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
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
      buildStructuredBinding({ behavior: "&lt", layerIndex: 2, keycode: "TAB" }, 7),
      "&lt 2 TAB",
    );
    assert.equal(
      buildStructuredBinding({ behavior: "&mt", modifier: "LEFT_SHIFT", keycode: "SPACE" }, 7),
      "&mt LEFT_SHIFT SPACE",
    );
  });

  it("parses existing editable hold-tap bindings for the picker draft", () => {
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
});
