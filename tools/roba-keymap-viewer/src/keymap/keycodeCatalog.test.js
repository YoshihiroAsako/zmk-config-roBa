import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, KEYCODE_CATALOG, searchCatalog } from "./keycodeCatalog.js";

describe("KEYCODE_CATALOG", () => {
  test("contains acceptance criteria keycodes: ESCAPE, F1, LEFT_ARROW, INT_YEN", () => {
    const codes = KEYCODE_CATALOG.map((item) => item.code);
    assert.ok(codes.includes("ESCAPE"), "ESCAPE missing");
    assert.ok(codes.includes("F1"), "F1 missing");
    assert.ok(codes.includes("LEFT_ARROW"), "LEFT_ARROW missing");
    assert.ok(codes.includes("INT_YEN"), "INT_YEN missing");
  });

  test("all items have required fields with correct types", () => {
    for (const item of KEYCODE_CATALOG) {
      assert.equal(typeof item.code, "string");
      assert.ok(item.code.length > 0, `code empty: ${JSON.stringify(item)}`);
      assert.equal(typeof item.label, "string");
      assert.equal(typeof item.category, "string");
      assert.ok(Array.isArray(item.aliases), `aliases not array: ${item.code}`);
      assert.equal(typeof item.note, "string");
    }
  });

  test("all item categories are in CATEGORIES", () => {
    const valid = new Set(CATEGORIES);
    for (const item of KEYCODE_CATALOG) {
      assert.ok(valid.has(item.category), `unknown category '${item.category}' on ${item.code}`);
    }
  });

  test("codes are unique", () => {
    const codes = KEYCODE_CATALOG.map((item) => item.code);
    assert.equal(new Set(codes).size, codes.length);
  });

  test("has 12 function keys", () => {
    const fKeys = KEYCODE_CATALOG.filter((item) => item.category === "Function keys");
    assert.equal(fKeys.length, 12);
  });

  test("has 26 letters", () => {
    const letters = KEYCODE_CATALOG.filter((item) => item.category === "Letters");
    assert.equal(letters.length, 26);
  });

  test("has 10 number keys", () => {
    const numbers = KEYCODE_CATALOG.filter((item) => item.category === "Numbers");
    assert.equal(numbers.length, 10);
  });
});

describe("searchCatalog", () => {
  test("returns all items when query and category are empty", () => {
    assert.equal(searchCatalog("", "").length, KEYCODE_CATALOG.length);
  });

  test("returns all items when query is whitespace-only", () => {
    assert.equal(searchCatalog("   ", "").length, KEYCODE_CATALOG.length);
  });

  test("filters by category only", () => {
    const results = searchCatalog("", "Function keys");
    assert.ok(results.every((item) => item.category === "Function keys"));
    assert.equal(results.length, 12);
  });

  test("matches by code (exact)", () => {
    const results = searchCatalog("ESCAPE");
    assert.ok(results.some((item) => item.code === "ESCAPE"));
  });

  test("matches by code case-insensitively", () => {
    const results = searchCatalog("escape");
    assert.ok(results.some((item) => item.code === "ESCAPE"));
  });

  test("matches by label", () => {
    const results = searchCatalog("Esc");
    assert.ok(results.some((item) => item.code === "ESCAPE"));
  });

  test("matches by alias", () => {
    const results = searchCatalog("ESC");
    assert.ok(results.some((item) => item.code === "ESCAPE"));
  });

  test("matches by note", () => {
    const results = searchCatalog("Escape");
    assert.ok(results.some((item) => item.code === "ESCAPE"));
  });

  test("matches F1 by code", () => {
    const results = searchCatalog("F1");
    assert.ok(results.some((item) => item.code === "F1"));
  });

  test("matches LEFT_ARROW by code", () => {
    const results = searchCatalog("LEFT_ARROW");
    assert.ok(results.some((item) => item.code === "LEFT_ARROW"));
  });

  test("matches LEFT_ARROW by alias LEFT", () => {
    const results = searchCatalog("left");
    assert.ok(results.some((item) => item.code === "LEFT_ARROW"));
  });

  test("matches INT_YEN by code", () => {
    const results = searchCatalog("INT_YEN");
    assert.ok(results.some((item) => item.code === "INT_YEN"));
  });

  test("matches INT_YEN by note keyword yen", () => {
    const results = searchCatalog("yen");
    assert.ok(results.some((item) => item.code === "INT_YEN"));
  });

  test("matches INT_YEN by note keyword JIS", () => {
    const results = searchCatalog("JIS");
    assert.ok(results.some((item) => item.code === "INT_YEN"));
  });

  test("returns empty array when nothing matches", () => {
    assert.equal(searchCatalog("xyzzy_no_match_ever").length, 0);
  });

  test("filters by both category and query", () => {
    const results = searchCatalog("F1", "Function keys");
    assert.ok(results.some((item) => item.code === "F1"));
    assert.ok(results.every((item) => item.category === "Function keys"));
  });

  test("category filter excludes items from other categories", () => {
    const results = searchCatalog("", "Navigation");
    assert.ok(results.every((item) => item.category === "Navigation"));
    assert.ok(results.some((item) => item.code === "LEFT_ARROW"));
    assert.ok(!results.some((item) => item.code === "F1"));
  });

  test("matches LEFT_BRACKET by alias LBKT", () => {
    const results = searchCatalog("LBKT");
    assert.ok(results.some((item) => item.code === "LEFT_BRACKET"));
  });

  test("matches RIGHT_ALT by note AltGr", () => {
    const results = searchCatalog("AltGr");
    assert.ok(results.some((item) => item.code === "RIGHT_ALT"));
  });
});
