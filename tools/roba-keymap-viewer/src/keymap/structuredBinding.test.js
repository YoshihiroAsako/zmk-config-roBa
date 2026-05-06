import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  KEY_PRESS_MODIFIERS,
  MOUSE_BUTTONS,
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
    assert.equal(
      buildStructuredBinding({ behavior: "&lt", layerIndex: 2, keycode: "A", keypressModifiers: ["LC"] }, 7),
      "&lt 2 LC(A)",
    );
    assert.equal(
      buildStructuredBinding(
        { behavior: "&mt", modifier: "LEFT_SHIFT", keycode: "A", keypressModifiers: ["LC", "LS"] },
        7,
      ),
      "&mt LEFT_SHIFT LC(LS(A))",
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
      keypressModifiers: [],
    });
    assert.deepEqual(parseStructuredBinding("&mt RIGHT_ALT INT_YEN", 7), {
      behavior: "&mt",
      layerIndex: 0,
      modifier: "RIGHT_ALT",
      keycode: "INT_YEN",
      keypressModifiers: [],
    });
    assert.deepEqual(parseStructuredBinding("&lt 1 LC(A)", 7), {
      behavior: "&lt",
      layerIndex: 1,
      modifier: "LEFT_SHIFT",
      keycode: "A",
      keypressModifiers: ["LC"],
    });
    assert.deepEqual(parseStructuredBinding("&mt LEFT_SHIFT LC(LS(A))", 7), {
      behavior: "&mt",
      layerIndex: 0,
      modifier: "LEFT_SHIFT",
      keycode: "A",
      keypressModifiers: ["LC", "LS"],
    });
  });

  it("round-trips lt / mt bindings with key press modifiers", () => {
    const ltBinding = "&lt 3 LC(LS(A))";
    const ltDraft = parseStructuredBinding(ltBinding, 7);
    assert.equal(buildStructuredBinding(ltDraft, 7), ltBinding);

    const mtBinding = "&mt RIGHT_ALT LC(B)";
    const mtDraft = parseStructuredBinding(mtBinding, 7);
    assert.equal(buildStructuredBinding(mtDraft, 7), mtBinding);

    const plainLt = "&lt 1 SPACE";
    assert.deepEqual(parseStructuredBinding(plainLt, 7).keypressModifiers, []);
    assert.equal(buildStructuredBinding(parseStructuredBinding(plainLt, 7), 7), plainLt);
  });

  it("builds and parses mouse button press bindings", () => {
    assert.equal(buildStructuredBinding({ behavior: "&mkp", mouseButton: "MB1" }), "&mkp MB1");
    assert.equal(buildStructuredBinding({ behavior: "&mkp", mouseButton: "MB4" }), "&mkp MB4");
    assert.equal(buildStructuredBinding({ behavior: "&mkp", mouseButton: "MB5" }), "&mkp MB5");
    assert.equal(buildStructuredBinding({ behavior: "&mkp" }), "&mkp MB1");

    assert.deepEqual(parseStructuredBinding("&mkp MB1"), {
      behavior: "&mkp",
      mouseButton: "MB1",
      layerIndex: 0,
      modifier: "LEFT_SHIFT",
      keycode: "A",
      keypressModifiers: [],
    });
    assert.deepEqual(parseStructuredBinding("&mkp MB3"), {
      behavior: "&mkp",
      mouseButton: "MB3",
      layerIndex: 0,
      modifier: "LEFT_SHIFT",
      keycode: "A",
      keypressModifiers: [],
    });
    assert.deepEqual(parseStructuredBinding("&mkp MB5"), {
      behavior: "&mkp",
      mouseButton: "MB5",
      layerIndex: 0,
      modifier: "LEFT_SHIFT",
      keycode: "A",
      keypressModifiers: [],
    });
  });

  it("round-trips all mouse button bindings", () => {
    for (const btn of MOUSE_BUTTONS) {
      const raw = `&mkp ${btn.code}`;
      const parsed = parseStructuredBinding(raw);
      assert.equal(buildStructuredBinding(parsed), raw);
    }
  });

  it("falls back to MB1 for unknown mouse button code in parse", () => {
    const parsed = parseStructuredBinding("&mkp UNKNOWN");
    assert.equal(parsed.behavior, "&mkp");
    assert.equal(parsed.mouseButton, "MB1");
  });

  it("rejects invalid mouse button in build", () => {
    assert.equal(validateStructuredBinding({ behavior: "&mkp", mouseButton: "MB9" }).ok, false);
    assert.equal(validateStructuredBinding({ behavior: "&mkp", mouseButton: "MB1" }).ok, true);
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
