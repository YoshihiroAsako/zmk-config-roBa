import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { nextKeyPosition, focusWrapTarget } from "./keyboardNavigation.js";

describe("キーボード図の移動", () => {
  const metadata = JSON.parse(readFileSync(new URL("../../../config/roBa.json", import.meta.url), "utf8"));
  const keys = metadata.layouts.default_layout.layout.map((key, position) => ({ ...key, position }));
  it("実配置の左右・上下へ移動する", () => {
    assert.equal(nextKeyPosition(keys, 0, "ArrowRight"), 1);
    assert.equal(nextKeyPosition(keys, 1, "ArrowLeft"), 0);
    assert.equal(nextKeyPosition(keys, 0, "ArrowDown"), 10);
    assert.equal(nextKeyPosition(keys, 10, "ArrowUp"), 0);
  });
  it("端では留まり、Home/End で両端へ移動する", () => {
    assert.equal(nextKeyPosition(keys, 0, "ArrowLeft"), 0);
    assert.equal(nextKeyPosition(keys, 15, "Home"), 0);
    assert.equal(nextKeyPosition(keys, 15, "End"), 42);
    assert.equal(nextKeyPosition(keys, 15, "Tab"), 15);
  });
  it("全キーから返す移動先は実在し、空配列でも安全", () => {
    for (const item of keys) for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) {
      assert.ok(keys.some((candidate) => candidate.position === nextKeyPosition(keys, item.position, key)));
    }
    assert.equal(nextKeyPosition([], 0, "End"), 0);
  });
});

describe("ダイアログのフォーカス循環", () => {
  const buttons = [{ id: "close" }, { id: "search" }, { id: "result" }];
  it("最後の Tab と先頭の Shift+Tab は内部へ戻る", () => {
    assert.equal(focusWrapTarget(buttons, buttons[2], false), buttons[0]);
    assert.equal(focusWrapTarget(buttons, buttons[0], true), buttons[2]);
  });
  it("中間移動を妨げず、検索結果の消失にも対応する", () => {
    assert.equal(focusWrapTarget(buttons, buttons[1], false), null);
    assert.equal(focusWrapTarget(buttons.slice(0, 2), buttons[2], false), buttons[0]);
    assert.equal(focusWrapTarget([buttons[0]], buttons[0], true), buttons[0]);
    assert.equal(focusWrapTarget([], null, false), null);
  });
});
