import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseKeymap } from "./parseKeymap.js";
import {
  checkKeymap,
  countIssues,
  findLayerActivators,
  findLayerOpenerPositions,
  findReachableLayers,
  layerReferences,
  resolveTransparent,
} from "./keymapChecks.js";

const source = readFileSync(new URL("../../../../config/roBa.keymap", import.meta.url), "utf8");
const original = parseKeymap(source);

function withEdits(edits) {
  let next = source;
  for (const [from, to] of edits) {
    assert.ok(next.includes(from), `元データに ${from} がある`);
    next = next.replace(from, to);
  }
  return parseKeymap(next);
}

const codes = (issues, level) => issues.filter((issue) => !level || issue.level === level).map((issue) => issue.code);

describe("レイヤーのつながり", () => {
  it("マクロ内の &to まで参照をたどる", () => {
    assert.deepEqual(layerReferences("&to_layer_0 INT_MUHENKAN", original.macros), [{ layer: 0, kind: "to" }]);
    assert.deepEqual(layerReferences("&lt 5 L"), [{ layer: 5, kind: "momentary" }]);
    assert.deepEqual(layerReferences("&kp A"), []);
  });

  it("正本では FUNCTION だけがどこからも有効にならない", () => {
    const reachable = findReachableLayers(original);
    const unreachable = original.layers.filter((layer) => !reachable.has(layer.id)).map((layer) => layer.name);
    assert.deepEqual(unreachable, ["FUNCTION"]);
    assert.ok(findLayerActivators(original).get(4).some((item) => item.via === "automouse"), "MOUSE は自動マウスで有効");
  });

  it("透過キーは default_layer の割り当てに解決し、レイヤーを開くキーを示す", () => {
    assert.equal(resolveTransparent(original, 1, 0), "&kp Q");
    assert.equal(resolveTransparent(original, 0, 0), null);
    assert.equal(resolveTransparent(original, 1, 5), null, "透過でないキー");
    assert.deepEqual(findLayerOpenerPositions(original, 5), [20, 36]);
    assert.deepEqual(findLayerOpenerPositions(original, 2).length, 2);
  });
});

describe("書き込み前チェック", () => {
  it("正本ではエラーなし、FUNCTION の到達不可を注意として出す", () => {
    const issues = checkKeymap(original, { keyCount: 43, source });
    assert.equal(countIssues(issues).error, 0);
    assert.deepEqual(codes(issues, "warn"), ["unreachable-layer"]);
    assert.match(issues.find((issue) => issue.code === "unreachable-layer").title, /FUNCTION/);
    assert.ok(codes(issues, "info").every((code) => code === "duplicate-key"));
  });

  it("存在しないレイヤー・範囲外と重複のコンボをエラーにする", () => {
    const edited = withEdits([
      ["&mo 5", "&mo 9"],
      ["key-positions = <12 13>;", "key-positions = <11 12>;"],
      ["key-positions = <24 25>;", "key-positions = <24 99>;"],
    ]);
    const issues = checkKeymap(edited, { keyCount: 43, source });
    const errors = codes(issues, "error");
    assert.ok(errors.includes("missing-layer"));
    assert.ok(errors.includes("combo-duplicate"));
    assert.ok(errors.includes("combo-position"));
    assert.equal(issues[0].level, "error", "エラーを先頭に並べる");
    const missing = issues.find((issue) => issue.code === "missing-layer");
    assert.deepEqual(missing.targets, [{ layer: 0, position: 36 }]);
  });

  it("&tog で入って戻れないレイヤーと、一番下の透過キーを注意する", () => {
    const edited = withEdits([
      ["&kp Y ", "&tog 1 "],
      ["&kp Q ", "&trans "],
      ["bindings = <&to_layer_0 INT_MUHENKAN>;", "bindings = <&kp INT_MUHENKAN>;"],
    ]);
    const issues = checkKeymap(edited, { keyCount: 43, source });
    const noReturn = issues.find((issue) => issue.code === "no-return");
    assert.ok(noReturn, "FUNCTION に戻るキーがない");
    assert.match(noReturn.title, /FUNCTION/);
    assert.deepEqual(noReturn.targets, [{ layer: 0, position: 5 }]);
    assert.ok(!codes(issues).includes("unreachable-layer"), "&tog で到達できる");
    assert.ok(codes(issues, "warn").includes("base-transparent"));
  });

  it("戻るキーがあるレイヤーは注意しない（透過キー経由の &tog、全レイヤーの &to コンボを含む）", () => {
    const viaCombo = withEdits([["&kp Y ", "&tog 1 "]]);
    assert.ok(!codes(checkKeymap(viaCombo, { keyCount: 43 })).includes("no-return"), "無変換コンボで layer 0 へ戻れる");
    const viaKey = withEdits([["&kp Y ", "&tog 1 "], ["&kp F13", "&tog 1"]]);
    assert.ok(!codes(checkKeymap(viaKey, { keyCount: 43 })).includes("no-return"));
    const edited = withEdits([["&kp LS(LG(S))", "&tog 1"]]);
    assert.ok(!codes(checkKeymap(edited, { keyCount: 43 })).includes("no-return"));
  });
});
