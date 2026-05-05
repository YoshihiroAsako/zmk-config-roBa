import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { isEditableBindingExpression, parseKeymap, replaceBinding, replaceBindings } from "./parseKeymap.js";

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

export async function saveBindingChanges({
  repoRoot,
  sourcePath = CANONICAL_SOURCE_PATH,
  changes,
  now = new Date(),
}) {
  const root = path.resolve(repoRoot);
  const normalizedSourcePath = normalizeSourcePath(sourcePath);

  if (normalizedSourcePath !== CANONICAL_SOURCE_PATH) {
    throw new Error("Only config/roBa.keymap can be saved.");
  }

  if (!Array.isArray(changes) || changes.length === 0) {
    throw new Error("At least one pending change is required.");
  }

  const sourceFile = path.resolve(root, ...CANONICAL_SOURCE_PATH.split("/"));
  assertInsideRepo(root, sourceFile);

  const source = await readFile(sourceFile, "utf8");
  for (const change of changes) {
    const currentSourceRaw = source.slice(change.range?.start, change.range?.end).trim();
    if (currentSourceRaw !== change.currentRaw) {
      throw new Error("One or more pending changes no longer match the source file. Reload before saving.");
    }
  }

  const beforeParsed = parseKeymap(source);
  const nextSource = replaceKeymapChanges(source, changes);
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
    message: `Saved ${changes.length} pending change${changes.length === 1 ? "" : "s"} with a backup.`,
    backupPath: toRepoRelativePath(root, backupPath),
    diagnostics,
  };
}

export function replaceKeymapChanges(source, changes) {
  const bindingChanges = changes.filter((change) => change.kind === "binding" || !change.kind);
  const sourceChanges = changes.filter((change) => change.kind && change.kind !== "binding");
  if (bindingChanges.length) {
    replaceBindings(source, bindingChanges.map((change) => ({
      range: change.range,
      nextRaw: change.nextRaw,
    })));
  }
  for (const change of sourceChanges) {
    validateSourceChange(source, change);
  }

  const ordered = [...changes].sort((a, b) => b.range.start - a.range.start);
  for (let index = 0; index < ordered.length; index += 1) {
    const next = ordered[index + 1];
    if (next && next.range.end > ordered[index].range.start) {
      throw new Error("Replacement ranges must not overlap.");
    }
  }

  return ordered.reduce((updated, change) => (
    `${updated.slice(0, change.range.start)}${change.nextRaw}${updated.slice(change.range.end)}`
  ), source);
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

function validateSourceChange(source, change) {
  validateRange(source, change.range);
  if (change.kind === "combo-binding") {
    if (!isEditableBindingExpression(change.currentRaw) || !isEditableBindingExpression(change.nextRaw)) {
      throw new Error("Combo binding replacement is not supported in Phase 2.");
    }
  } else if (change.kind === "combo-positions") {
    validateComboPositions(change.nextRaw);
    if (!/^[\d\s]+$/.test(source.slice(change.range.start, change.range.end))) {
      throw new Error("Combo positions source range is invalid.");
    }
  } else if (change.kind === "layers-replace") {
    validateLayerValues(change.nextRaw);
    if (!/^[\d\s]+$/.test(source.slice(change.range.start, change.range.end))) {
      throw new Error("Layers source range is invalid.");
    }
  } else if (change.kind === "layers-remove") {
    if (change.nextRaw !== "") throw new Error("layers-remove must have empty nextRaw.");
    if (!/layers\s*=/.test(source.slice(change.range.start, change.range.end))) {
      throw new Error("Layers remove range does not contain a layers property.");
    }
  } else if (change.kind === "layers-insert") {
    if (change.range.start !== change.range.end) throw new Error("layers-insert must be a zero-length range.");
    validateLayerInsertionContent(change.nextRaw);
  } else if (change.kind === "timeout-ms-replace") {
    validateTimeoutMsValue(change.nextRaw);
    if (!/^\d+$/.test(source.slice(change.range.start, change.range.end).trim())) {
      throw new Error("Timeout-ms source range is invalid.");
    }
  } else if (change.kind === "timeout-ms-remove") {
    if (change.nextRaw !== "") throw new Error("timeout-ms-remove must have empty nextRaw.");
    if (!/timeout-ms\s*=/.test(source.slice(change.range.start, change.range.end))) {
      throw new Error("Timeout-ms remove range does not contain a timeout-ms property.");
    }
  } else if (change.kind === "timeout-ms-insert") {
    if (change.range.start !== change.range.end) throw new Error("timeout-ms-insert must be a zero-length range.");
    validateTimeoutMsInsertionContent(change.nextRaw);
  } else {
    throw new Error("Unsupported pending change kind.");
  }
}

function validateRange(source, range) {
  if (
    !range ||
    !Number.isInteger(range.start) ||
    !Number.isInteger(range.end) ||
    range.start < 0 ||
    range.end < range.start ||
    range.end > source.length
  ) {
    throw new Error("Invalid source range.");
  }
}

function validateComboPositions(raw, keyCount = 43) {
  const text = String(raw || "");
  if (!text || text !== text.trim() || text !== text.replace(/\s+/g, " ")) {
    throw new Error("Combo positions must be a single-space-separated list.");
  }
  const positions = text.split(" ").map((value) => {
    if (!/^\d+$/.test(value)) throw new Error("Combo positions must be integer key positions.");
    return Number(value);
  });
  if (positions.length < 2) throw new Error("Combo positions must include at least two keys.");
  if (new Set(positions).size !== positions.length) throw new Error("Combo positions must be unique.");
  if (positions.some((position) => position < 0 || position >= keyCount)) {
    throw new Error(`Combo positions must be between 0 and ${keyCount - 1}.`);
  }
}

function validateLayerValues(raw, layerCount = 7) {
  const text = String(raw || "").trim();
  if (!text) throw new Error("Combo layers must not be empty.");
  if (text !== text.replace(/\s+/g, " ")) throw new Error("Combo layers must be a single-space-separated list.");
  const layers = text.split(" ").map((value) => {
    if (!/^\d+$/.test(value)) throw new Error("Combo layers must be integer layer indices.");
    return Number(value);
  });
  if (new Set(layers).size !== layers.length) throw new Error("Combo layers must be unique.");
  if (layers.some((layer) => layer < 0 || layer >= layerCount)) {
    throw new Error(`Combo layers must be between 0 and ${layerCount - 1}.`);
  }
}

function validateLayerInsertionContent(nextRaw) {
  const match = nextRaw.match(/layers\s*=\s*<([\d\s]+)>;\r?\n$/);
  if (!match) throw new Error("layers-insert content is invalid.");
  validateLayerValues(match[1].trim());
}

function validateTimeoutMsValue(raw) {
  const text = String(raw || "").trim();
  if (!/^\d+$/.test(text)) throw new Error("Combo timeout-ms must be a non-negative integer.");
  const value = Number(text);
  if (value < 1 || value > 10000) throw new Error("Combo timeout-ms must be between 1 and 10000.");
}

function validateTimeoutMsInsertionContent(nextRaw) {
  const match = nextRaw.match(/timeout-ms\s*=\s*<(\d+)>;\r?\n$/);
  if (!match) throw new Error("timeout-ms-insert content is invalid.");
  validateTimeoutMsValue(match[1]);
}
