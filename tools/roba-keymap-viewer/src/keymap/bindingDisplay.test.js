import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeKeyFace, findBindingsForCharacter } from "./bindingDisplay.js";

const layers = ["default_layer", "FUNCTION", "NUM", "ARROW", "MOUSE", "SCROLL", "BT"];

describe("キー表面の 2 段表示", () => {
  it("短押しを上段、長押しを下段に出す", () => {
    assert.deepEqual(describeKeyFace("&lt 5 L", layers), { top: "L", bottom: "SCROLL", tone: "layer" });
    assert.deepEqual(describeKeyFace("&mt LEFT_SHIFT A", layers), { top: "A", bottom: "LSFT", tone: "hold-modifier" });
    assert.deepEqual(describeKeyFace("&mo 5", layers), { top: "SCROLL", bottom: "押す間", tone: "layer" });
  });

  it("種類ごとに色分け用の分類を返す", () => {
    assert.equal(describeKeyFace("&kp Q").tone, "key");
    assert.equal(describeKeyFace("&kp LCTRL").tone, "modifier");
    assert.equal(describeKeyFace("&mkp MB1").tone, "mouse");
    assert.equal(describeKeyFace("&bt BT_SEL 0").tone, "system");
    assert.equal(describeKeyFace("&trans").tone, "transparent");
    assert.deepEqual(describeKeyFace("&tog 2", layers), { top: "NUM", bottom: "切替/戻", tone: "layer" });
  });
});

describe("出したい文字からの逆引き（Windows 日本語配列）", () => {
  it("US 配列と文字が異なる記号は対応表の割り当てを返す", () => {
    assert.deepEqual(findBindingsForCharacter("(").map((item) => item.binding), ["&kp ASTERISK"]);
    assert.deepEqual(findBindingsForCharacter("_").map((item) => item.binding), ["&kp LS(INT_RO)"]);
    assert.deepEqual(findBindingsForCharacter("*").map((item) => item.binding), ["&kp DOUBLE_QUOTES"]);
  });

  it("全角入力・同じ文字の記号・英数字も扱い、対応表にない文字は返さない", () => {
    assert.deepEqual(findBindingsForCharacter("（").map((item) => item.binding), ["&kp ASTERISK"]);
    assert.deepEqual(findBindingsForCharacter("?").map((item) => item.binding), ["&kp QMARK"]);
    assert.deepEqual(findBindingsForCharacter("a").map((item) => item.binding), ["&kp A"]);
    assert.deepEqual(findBindingsForCharacter("7").map((item) => item.binding), ["&kp N7"]);
    assert.deepEqual(findBindingsForCharacter(")").map((item) => item.binding), ["&kp LEFT_PARENTHESIS"]);
    assert.deepEqual(findBindingsForCharacter("€"), [], "対応表にない文字");
    assert.deepEqual(findBindingsForCharacter("ab"), [], "2 文字以上は対象外");
  });
});
