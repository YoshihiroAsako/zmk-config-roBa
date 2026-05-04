import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseKeymap, replaceBinding } from "./parseKeymap.js";

const CANONICAL_SOURCE_PATH = "config/roBa.keymap";

export async function saveBindingChange({
  repoRoot,
  sourcePath = CANONICAL_SOURCE_PATH,
  range,
  currentRaw,
  nextRaw,
  now = new Date(),
}) {
  const root = path.resolve(repoRoot);
  const normalizedSourcePath = normalizeSourcePath(sourcePath);

  if (normalizedSourcePath !== CANONICAL_SOURCE_PATH) {
    throw new Error("Only config/roBa.keymap can be saved.");
  }

  const sourceFile = path.resolve(root, ...CANONICAL_SOURCE_PATH.split("/"));
  assertInsideRepo(root, sourceFile);

  const source = await readFile(sourceFile, "utf8");
  const currentSourceRaw = source.slice(range?.start, range?.end).trim();
  if (currentSourceRaw !== currentRaw) {
    throw new Error("Current binding no longer matches the source file. Reload before saving.");
  }

  const beforeParsed = parseKeymap(source);
  const nextSource = replaceBinding(source, range, nextRaw);
  const afterParsed = parseKeymap(nextSource);
  const diagnostics = buildSaveDiagnostics(beforeParsed, afterParsed);
  const failedDiagnostic = diagnostics.find((item) => !item.ok);
  if (failedDiagnostic) {
    throw new Error(`Save rejected because ${failedDiagnostic.label} changed.`);
  }

  const backupPath = await writeBackup(root, source, now);
  const tempPath = `${sourceFile}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(tempPath, nextSource, "utf8");
    await rename(tempPath, sourceFile);
  } catch (error) {
    await removeTempFile(tempPath);
    throw error;
  }

  const savedSource = await readFile(sourceFile, "utf8");
  if (savedSource !== nextSource) {
    throw new Error("Saved source verification failed.");
  }

  return {
    ok: true,
    message: "Saved config/roBa.keymap with a backup.",
    backupPath: toRepoRelativePath(root, backupPath),
    diagnostics,
  };
}

export function buildSaveDiagnostics(beforeParsed, afterParsed) {
  const beforeLayerBindingCounts = beforeParsed.layers.map((layer) => layer.bindings.length);
  const afterLayerBindingCounts = afterParsed.layers.map((layer) => layer.bindings.length);
  const beforeSensorBindingCount = countSensorBindings(beforeParsed);
  const afterSensorBindingCount = countSensorBindings(afterParsed);

  return [
    {
      label: "Layer count",
      before: beforeParsed.layers.length,
      after: afterParsed.layers.length,
      ok: beforeParsed.layers.length === afterParsed.layers.length,
    },
    {
      label: "Layer binding counts",
      before: beforeLayerBindingCounts.join(","),
      after: afterLayerBindingCounts.join(","),
      ok: beforeLayerBindingCounts.length === afterLayerBindingCounts.length &&
        beforeLayerBindingCounts.every((count, index) => count === afterLayerBindingCounts[index]),
    },
    {
      label: "Combo count",
      before: beforeParsed.combos.length,
      after: afterParsed.combos.length,
      ok: beforeParsed.combos.length === afterParsed.combos.length,
    },
    {
      label: "Macro count",
      before: beforeParsed.macros.length,
      after: afterParsed.macros.length,
      ok: beforeParsed.macros.length === afterParsed.macros.length,
    },
    {
      label: "Sensor binding count",
      before: beforeSensorBindingCount,
      after: afterSensorBindingCount,
      ok: beforeSensorBindingCount === afterSensorBindingCount,
    },
  ];
}

function normalizeSourcePath(sourcePath) {
  return String(sourcePath || "").replace(/\\/g, "/").replace(/^\.\/+/, "");
}

function assertInsideRepo(root, target) {
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Resolved source path is outside the repository.");
  }
}

async function writeBackup(root, source, now) {
  const backupDir = path.join(root, "config", ".roBa.keymap.bak");
  await mkdir(backupDir, { recursive: true });

  for (let index = 0; index < 100; index += 1) {
    const suffix = index === 0 ? "" : `-${String(index).padStart(2, "0")}`;
    const backupPath = path.join(backupDir, `${formatBackupTimestamp(now)}${suffix}.roBa.keymap`);
    try {
      await writeFile(backupPath, source, { encoding: "utf8", flag: "wx" });
      return backupPath;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
  }

  throw new Error("Could not create a unique keymap backup.");
}

async function removeTempFile(tempPath) {
  try {
    await unlink(tempPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function formatBackupTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function countSensorBindings(parsed) {
  return parsed.layers.reduce((count, layer) => count + layer.sensorBindings.length, 0);
}

function toRepoRelativePath(root, target) {
  return path.relative(root, target).replace(/\\/g, "/");
}
