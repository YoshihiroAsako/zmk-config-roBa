import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { parseKeymap } from "./parseKeymap.js";
import { buildSaveDiagnostics, saveBindingChange, saveBindingChanges } from "./saveBindingChange.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../../..");

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

async function withTempRepo(source, callback) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "roba-keymap-save-"));
  try {
    await mkdir(path.join(tempRoot, "config"), { recursive: true });
    await writeFile(path.join(tempRoot, "config", "roBa.keymap"), source, "utf8");
    return await callback(tempRoot);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function readTempKeymap(tempRoot) {
  return readFile(path.join(tempRoot, "config", "roBa.keymap"), "utf8");
}

describe("save binding change helper", () => {
  it("backs up and saves one editable binding change", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const selectedEntry = parsed.layers[0].bindingEntries[0];

    await withTempRepo(source, async (tempRoot) => {
      const result = await saveBindingChange({
        repoRoot: tempRoot,
        sourcePath: "config/roBa.keymap",
        range: selectedEntry.sourceRange,
        currentRaw: selectedEntry.raw,
        nextRaw: "&kp B",
        now: new Date(2026, 4, 4, 12, 34, 56),
      });
      const savedSource = await readTempKeymap(tempRoot);
      const backupSource = await readFile(path.join(tempRoot, result.backupPath), "utf8");
      const savedParsed = parseKeymap(savedSource);

      assert.equal(result.ok, true);
      assert.equal(result.backupPath, "config/.roBa.keymap.bak/20260504-123456.roBa.keymap");
      assert.equal(backupSource, source);
      assert.equal(savedParsed.layers[0].bindings[0], "&kp B");
      assert.equal(savedSource, `${source.slice(0, selectedEntry.sourceRange.start)}&kp B${source.slice(selectedEntry.sourceRange.end)}`);
      assert.equal(result.diagnostics.every((item) => item.ok), true);
    });
  });

  it("rejects stale currentRaw values without changing the source", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const selectedEntry = parseKeymap(source).layers[0].bindingEntries[0];

    await withTempRepo(source, async (tempRoot) => {
      await assert.rejects(
        () => saveBindingChange({
          repoRoot: tempRoot,
          range: selectedEntry.sourceRange,
          currentRaw: "&kp STALE",
          nextRaw: "&kp B",
        }),
        /no longer matches/,
      );

      assert.equal(await readTempKeymap(tempRoot), source);
    });
  });

  it("rejects unsupported bindings and non-canonical source paths", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const selectedEntry = parseKeymap(source).layers[0].bindingEntries[0];

    await withTempRepo(source, async (tempRoot) => {
      await assert.rejects(
        () => saveBindingChange({
          repoRoot: tempRoot,
          sourcePath: "config/roBa.keymap",
          range: selectedEntry.sourceRange,
          currentRaw: selectedEntry.raw,
          nextRaw: "&bt BT_SEL 0",
        }),
        /not supported/,
      );
      await assert.rejects(
        () => saveBindingChange({
          repoRoot: tempRoot,
          sourcePath: "config/other.keymap",
          range: selectedEntry.sourceRange,
          currentRaw: selectedEntry.raw,
          nextRaw: "&kp B",
        }),
        /Only config\/roBa\.keymap/,
      );

      assert.equal(await readTempKeymap(tempRoot), source);
    });
  });

  it("does not write the keymap when backup creation fails", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const selectedEntry = parseKeymap(source).layers[0].bindingEntries[0];

    await withTempRepo(source, async (tempRoot) => {
      await writeFile(path.join(tempRoot, "config", ".roBa.keymap.bak"), "not a directory", "utf8");

      await assert.rejects(
        () => saveBindingChange({
          repoRoot: tempRoot,
          range: selectedEntry.sourceRange,
          currentRaw: selectedEntry.raw,
          nextRaw: "&kp B",
        }),
        /EEXIST|ENOTDIR/,
      );

      assert.equal(await readTempKeymap(tempRoot), source);
    });
  });

  it("reports stable parse diagnostics for a one-binding replacement", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const beforeParsed = parseKeymap(source);
    const afterSource = source.replace("&kp Q", "&kp B");
    const diagnostics = buildSaveDiagnostics(beforeParsed, parseKeymap(afterSource));

    assert.deepEqual(
      diagnostics.map((item) => [item.label, item.ok]),
      [
        ["Layer count", true],
        ["Layer binding counts", true],
        ["Combo count", true],
        ["Macro count", true],
        ["Sensor binding count", true],
      ],
    );
  });

  it("backs up once and saves multiple editable binding changes", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const firstEntry = parsed.layers[0].bindingEntries[0];
    const secondEntry = parsed.layers[0].bindingEntries[38];

    await withTempRepo(source, async (tempRoot) => {
      const result = await saveBindingChanges({
        repoRoot: tempRoot,
        sourcePath: "config/roBa.keymap",
        changes: [
          {
            range: firstEntry.sourceRange,
            currentRaw: firstEntry.raw,
            nextRaw: "&kp B",
          },
          {
            range: secondEntry.sourceRange,
            currentRaw: secondEntry.raw,
            nextRaw: "&lt 1 TAB",
          },
        ],
        now: new Date(2026, 4, 4, 13, 10, 11),
      });
      const savedSource = await readTempKeymap(tempRoot);
      const backupSource = await readFile(path.join(tempRoot, result.backupPath), "utf8");
      const savedParsed = parseKeymap(savedSource);

      assert.equal(result.ok, true);
      assert.equal(result.message, "Saved 2 pending changes with a backup.");
      assert.equal(result.backupPath, "config/.roBa.keymap.bak/20260504-131011.roBa.keymap");
      assert.equal(backupSource, source);
      assert.equal(savedParsed.layers[0].bindings[0], "&kp B");
      assert.equal(savedParsed.layers[0].bindings[38], "&lt 1 TAB");
      assert.equal(savedParsed.layers[0].bindings.length, parsed.layers[0].bindings.length);
      assert.equal(result.diagnostics.every((item) => item.ok), true);
    });
  });

  it("rejects one stale currentRaw in a multi-change save without changing the source", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const parsed = parseKeymap(source);
    const firstEntry = parsed.layers[0].bindingEntries[0];
    const secondEntry = parsed.layers[0].bindingEntries[38];

    await withTempRepo(source, async (tempRoot) => {
      await assert.rejects(
        () => saveBindingChanges({
          repoRoot: tempRoot,
          changes: [
            {
              range: firstEntry.sourceRange,
              currentRaw: firstEntry.raw,
              nextRaw: "&kp B",
            },
            {
              range: secondEntry.sourceRange,
              currentRaw: "&lt 9 STALE",
              nextRaw: "&lt 1 TAB",
            },
          ],
        }),
        /no longer match/,
      );

      assert.equal(await readTempKeymap(tempRoot), source);
    });
  });

  it("rejects overlapping multi-change ranges without changing the source", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const selectedEntry = parseKeymap(source).layers[0].bindingEntries[0];

    await withTempRepo(source, async (tempRoot) => {
      await assert.rejects(
        () => saveBindingChanges({
          repoRoot: tempRoot,
          changes: [
            {
              range: selectedEntry.sourceRange,
              currentRaw: selectedEntry.raw,
              nextRaw: "&kp B",
            },
            {
              range: selectedEntry.sourceRange,
              currentRaw: selectedEntry.raw,
              nextRaw: "&kp C",
            },
          ],
        }),
        /overlap/,
      );

      assert.equal(await readTempKeymap(tempRoot), source);
    });
  });

  it("rejects empty, unsupported, and non-canonical multi-change saves", async () => {
    const source = await readRepoFile("config/roBa.keymap");
    const selectedEntry = parseKeymap(source).layers[0].bindingEntries[0];

    await withTempRepo(source, async (tempRoot) => {
      await assert.rejects(
        () => saveBindingChanges({
          repoRoot: tempRoot,
          changes: [],
        }),
        /At least one/,
      );
      await assert.rejects(
        () => saveBindingChanges({
          repoRoot: tempRoot,
          changes: [
            {
              range: selectedEntry.sourceRange,
              currentRaw: selectedEntry.raw,
              nextRaw: "&bt BT_SEL 0",
            },
          ],
        }),
        /not supported/,
      );
      await assert.rejects(
        () => saveBindingChanges({
          repoRoot: tempRoot,
          sourcePath: "config/other.keymap",
          changes: [
            {
              range: selectedEntry.sourceRange,
              currentRaw: selectedEntry.raw,
              nextRaw: "&kp B",
            },
          ],
        }),
        /Only config\/roBa\.keymap/,
      );

      assert.equal(await readTempKeymap(tempRoot), source);
    });
  });
});
