import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { isEditableBindingExpression, parseKeymap, replaceBinding, replaceBindings } from "./parseKeymap.js";

const CANONICAL_SOURCE_PATH = "config/roBa.keymap";
const BACKUP_DIR_PATH = "config/.roBa.keymap.bak";

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
  const expectedDeltas = getExpectedDeltas(changes);
  const diagnostics = buildSaveDiagnostics(beforeParsed, afterParsed, expectedDeltas);
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

export async function listKeymapBackups({ repoRoot, limit = 10 }) {
  const root = path.resolve(repoRoot);
  const backupDir = path.join(root, ...BACKUP_DIR_PATH.split("/"));
  assertInsideRepo(root, backupDir);

  let entries;
  try {
    entries = await readdir(backupDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const backups = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".roBa.keymap")) continue;
    const backupPath = path.join(backupDir, entry.name);
    assertInsideRepo(root, backupPath);
    const fileStat = await stat(backupPath);
    backups.push({
      name: entry.name,
      path: toRepoRelativePath(root, backupPath),
      size: fileStat.size,
      mtime: fileStat.mtimeMs,
    });
  }

  return backups
    .sort((a, b) => b.mtime - a.mtime || b.name.localeCompare(a.name))
    .slice(0, Math.max(0, limit));
}

export async function restoreKeymapBackup({
  repoRoot,
  backupPath,
  now = new Date(),
}) {
  const root = path.resolve(repoRoot);
  const sourceFile = path.resolve(root, ...CANONICAL_SOURCE_PATH.split("/"));
  const resolvedBackupPath = resolveBackupPath(root, backupPath);
  assertInsideRepo(root, sourceFile);

  const [currentSource, backupSource] = await Promise.all([
    readFile(sourceFile, "utf8"),
    readFile(resolvedBackupPath, "utf8"),
  ]);

  const preRestoreBackupPath = await writeBackup(root, currentSource, now);
  const tempPath = `${sourceFile}.${process.pid}.${Date.now()}.restore.tmp`;
  try {
    await writeFile(tempPath, backupSource, "utf8");
    await rename(tempPath, sourceFile);
  } catch (error) {
    await removeTempFile(tempPath);
    throw error;
  }

  const savedSource = await readFile(sourceFile, "utf8");
  if (savedSource !== backupSource) {
    throw new Error("Restored source verification failed.");
  }

  return {
    ok: true,
    message: "Restored config/roBa.keymap from backup.",
    restoredPath: toRepoRelativePath(root, resolvedBackupPath),
    backupPath: toRepoRelativePath(root, preRestoreBackupPath),
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

export function buildSaveDiagnostics(beforeParsed, afterParsed, expectedDeltas = {}) {
  const expectedComboDelta = expectedDeltas.comboDelta || 0;
  const expectedMacroDelta = expectedDeltas.macroDelta || 0;
  const beforeLayerBindingCounts = beforeParsed.layers.map((layer) => layer.bindings.length);
  const afterLayerBindingCounts = afterParsed.layers.map((layer) => layer.bindings.length);
  const beforeSensorBindingCount = countSensorBindings(beforeParsed);
  const afterSensorBindingCount = countSensorBindings(afterParsed);
  const expectedSensorBindingDelta = expectedDeltas.sensorBindingDelta || 0;

  const beforeUniqueLayerNames = new Set(beforeParsed.layers.map((layer) => layer.name)).size;
  const afterUniqueLayerNames = new Set(afterParsed.layers.map((layer) => layer.name)).size;

  return [
    {
      label: "Layer count",
      before: beforeParsed.layers.length,
      after: afterParsed.layers.length,
      ok: beforeParsed.layers.length === afterParsed.layers.length,
    },
    {
      label: "Unique layer names",
      before: beforeUniqueLayerNames,
      after: afterUniqueLayerNames,
      ok: afterUniqueLayerNames === afterParsed.layers.length,
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
      ok: afterParsed.combos.length === beforeParsed.combos.length + expectedComboDelta,
    },
    {
      label: "Macro count",
      before: beforeParsed.macros.length,
      after: afterParsed.macros.length,
      ok: afterParsed.macros.length === beforeParsed.macros.length + expectedMacroDelta,
    },
    {
      label: "Sensor binding count",
      before: beforeSensorBindingCount,
      after: afterSensorBindingCount,
      ok: afterSensorBindingCount === beforeSensorBindingCount + expectedSensorBindingDelta,
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
  const backupDir = path.join(root, ...BACKUP_DIR_PATH.split("/"));
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

function resolveBackupPath(root, backupPath) {
  const normalized = normalizeSourcePath(backupPath);
  if (!normalized.startsWith(`${BACKUP_DIR_PATH}/`) || !normalized.endsWith(".roBa.keymap")) {
    throw new Error("Backup path must point to config/.roBa.keymap.bak/*.roBa.keymap.");
  }

  const resolved = path.resolve(root, ...normalized.split("/"));
  const backupDir = path.resolve(root, ...BACKUP_DIR_PATH.split("/"));
  assertInsideRepo(root, resolved);
  const relativeToBackupDir = path.relative(backupDir, resolved);
  if (relativeToBackupDir.startsWith("..") || path.isAbsolute(relativeToBackupDir)) {
    throw new Error("Resolved backup path is outside the backup directory.");
  }
  return resolved;
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
  if (change.kind === "combo-binding" || change.kind === "macro-binding") {
    if (!isEditableBindingExpression(change.currentRaw) || !isEditableBindingExpression(change.nextRaw)) {
      throw new Error(`${change.kind} replacement is not supported in Phase 2.`);
    }
  } else if (change.kind === "macro-bindings-replace") {
    validateMacroBindingsReplacement(change.currentRaw, change.nextRaw);
    const beforeParsed = parseKeymap(source);
    const nextSource = `${source.slice(0, change.range.start)}${change.nextRaw}${source.slice(change.range.end)}`;
    const afterParsed = parseKeymap(nextSource);
    if (afterParsed.macros.length !== beforeParsed.macros.length) {
      throw new Error("macro-bindings-replace must keep macro count stable.");
    }
    if (!afterParsed.macros.some((macro) => macro.name === change.macroName)) {
      throw new Error("macro-bindings-replace target macro is missing after replacement.");
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
  } else if (change.kind === "wait-ms-replace" || change.kind === "tap-ms-replace") {
    const propertyName = change.kind.replace("-replace", "");
    validateMacroMsValue(change.nextRaw, propertyName);
    if (!/^\d+$/.test(source.slice(change.range.start, change.range.end).trim())) {
      throw new Error(`${propertyName} source range is invalid.`);
    }
  } else if (change.kind === "wait-ms-remove" || change.kind === "tap-ms-remove") {
    const propertyName = change.kind.replace("-remove", "");
    if (change.nextRaw !== "") throw new Error(`${change.kind} must have empty nextRaw.`);
    if (!new RegExp(`${propertyName}\\s*=`).test(source.slice(change.range.start, change.range.end))) {
      throw new Error(`${propertyName} remove range does not contain a ${propertyName} property.`);
    }
  } else if (change.kind === "wait-ms-insert" || change.kind === "tap-ms-insert") {
    const propertyName = change.kind.replace("-insert", "");
    if (change.range.start !== change.range.end) throw new Error(`${change.kind} must be a zero-length range.`);
    validateMacroMsInsertionContent(change.nextRaw, propertyName);
  } else if (change.kind === "layer-rename") {
    validateLayerName(change.nextRaw);
    if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(source.slice(change.range.start, change.range.end))) {
      throw new Error("Layer rename source range does not contain a valid identifier.");
    }
  } else if (change.kind === "combo-node-insert") {
    if (change.range.start !== change.range.end) throw new Error("combo-node-insert must be a zero-length range.");
    if (change.currentRaw !== "") throw new Error("combo-node-insert must have empty currentRaw.");
    validateComboNodeInsertion(source, change);
  } else if (change.kind === "macro-node-insert") {
    if (change.range.start !== change.range.end) throw new Error("macro-node-insert must be a zero-length range.");
    if (change.currentRaw !== "") throw new Error("macro-node-insert must have empty currentRaw.");
    validateMacroNodeInsertion(source, change);
  } else if (change.kind === "trackball-automouse-layer") {
    validateAutomouseLayerValue(change.nextRaw);
    if (!/^\d+$/.test(source.slice(change.range.start, change.range.end).trim())) {
      throw new Error("automouse-layer source range is invalid.");
    }
    validateTrackballSettingsPreserved(source, change);
  } else if (change.kind === "trackball-scroll-layers") {
    validateScrollLayersValue(change.nextRaw);
    if (!/^[\d\s]+$/.test(source.slice(change.range.start, change.range.end).trim())) {
      throw new Error("scroll-layers source range is invalid.");
    }
    validateTrackballSettingsPreserved(source, change);
  } else if (change.kind === "sensor-binding") {
    if (!/^&inc_dec_kp \S+ \S+$/.test(change.nextRaw.trim())) {
      throw new Error("sensor-binding nextRaw must match &inc_dec_kp X Y format.");
    }
    const currentSourceText = source.slice(change.range.start, change.range.end).trim();
    if (!/^&inc_dec_kp \S+ \S+$/.test(currentSourceText)) {
      throw new Error("sensor-binding source range does not contain a valid &inc_dec_kp expression.");
    }
    validateSensorBindingPreserved(source, change);
  } else if (change.kind === "sensor-binding-insert") {
    if (change.range.start !== change.range.end) throw new Error("sensor-binding-insert must be a zero-length range.");
    if (change.currentRaw !== "") throw new Error("sensor-binding-insert must have empty currentRaw.");
    validateSensorBindingInsertionContent(change.nextRaw);
    validateSensorBindingInserted(source, change);
  } else if (change.kind === "sensor-binding-remove") {
    if (change.nextRaw !== "") throw new Error("sensor-binding-remove must have empty nextRaw.");
    if (!/sensor-bindings\s*=/.test(source.slice(change.range.start, change.range.end))) {
      throw new Error("sensor-binding-remove range does not contain a sensor-bindings property.");
    }
    validateSensorBindingRemoved(source, change);
  } else {
    throw new Error("Unsupported pending change kind.");
  }
}

function getExpectedDeltas(changes) {
  return {
    comboDelta: changes.filter((change) => change.kind === "combo-node-insert").length,
    macroDelta: changes.filter((change) => change.kind === "macro-node-insert").length,
    sensorBindingDelta: changes.filter((change) => change.kind === "sensor-binding-insert").length -
      changes.filter((change) => change.kind === "sensor-binding-remove").length,
  };
}

function validateComboNodeInsertion(source, change) {
  if (typeof change.nextRaw !== "string" || !change.nextRaw.endsWith("\n")) {
    throw new Error("combo-node-insert content must end with a newline.");
  }
  if (!/^\s*[A-Za-z_][A-Za-z0-9_-]*\s*\{[\s\S]*\};\r?\n$/.test(change.nextRaw)) {
    throw new Error("combo-node-insert content is invalid.");
  }

  const beforeParsed = parseKeymap(source);
  const nextSource = `${source.slice(0, change.range.start)}${change.nextRaw}${source.slice(change.range.end)}`;
  const afterParsed = parseKeymap(nextSource);
  if (afterParsed.combos.length !== beforeParsed.combos.length + 1) {
    throw new Error("combo-node-insert must add exactly one combo.");
  }
  const inserted = afterParsed.combos.find((combo) => !beforeParsed.combos.some((before) => before.name === combo.name));
  if (!inserted) throw new Error("combo-node-insert did not add a unique combo name.");
  if (!isEditableBindingExpression(inserted.binding)) {
    throw new Error("combo-node-insert binding is not supported.");
  }
  validateComboPositions(inserted.positions.join(" "));
  if (inserted.layers.length) validateLayerValues(inserted.layers.join(" "));
  if (inserted.timeoutMsRange) validateTimeoutMsValue(String(inserted.timeoutMs));
}

function validateMacroNodeInsertion(source, change) {
  if (typeof change.nextRaw !== "string" || !change.nextRaw.endsWith("\n")) {
    throw new Error("macro-node-insert content must end with a newline.");
  }
  if (!/^\s*[A-Za-z_][A-Za-z0-9_-]*:\s*[A-Za-z_][A-Za-z0-9_-]*\s*\{[\s\S]*\};\r?\n$/.test(change.nextRaw)) {
    throw new Error("macro-node-insert content is invalid.");
  }

  const beforeParsed = parseKeymap(source);
  const nextSource = `${source.slice(0, change.range.start)}${change.nextRaw}${source.slice(change.range.end)}`;
  const afterParsed = parseKeymap(nextSource);
  if (afterParsed.macros.length !== beforeParsed.macros.length + 1) {
    throw new Error("macro-node-insert must add exactly one macro.");
  }
  const inserted = afterParsed.macros.find((macro) => !beforeParsed.macros.some((before) => before.name === macro.name));
  if (!inserted) throw new Error("macro-node-insert did not add a unique macro name.");
  if (inserted.compatible !== "zmk,behavior-macro") {
    throw new Error("macro-node-insert compatible value is invalid.");
  }
  if (inserted.bindingCells !== 0) {
    throw new Error("macro-node-insert #binding-cells value is invalid.");
  }
  if (!inserted.bindings.length || inserted.bindings.some((binding) => !isEditableBindingExpression(binding))) {
    throw new Error("macro-node-insert bindings are not supported.");
  }
  if (inserted.waitMsRange) validateMacroMsValue(String(inserted.waitMs), "wait-ms");
  if (inserted.tapMsRange) validateMacroMsValue(String(inserted.tapMs), "tap-ms");
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

function validateMacroMsValue(raw, propertyName) {
  const text = String(raw || "").trim();
  if (!/^\d+$/.test(text)) throw new Error(`${propertyName} must be a non-negative integer.`);
  const value = Number(text);
  if (value < 0 || value > 10000) throw new Error(`${propertyName} must be between 0 and 10000.`);
}

function validateMacroMsInsertionContent(nextRaw, propertyName) {
  const pattern = new RegExp(`${propertyName}\\s*=\\s*<(\\d+)>;\\r?\\n$`);
  const match = nextRaw.match(pattern);
  if (!match) throw new Error(`${propertyName}-insert content is invalid.`);
  validateMacroMsValue(match[1], propertyName);
}

function validateLayerName(name) {
  if (typeof name !== "string" || !name.length) {
    throw new Error("Layer name must be a non-empty string.");
  }
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(name)) {
    throw new Error("Layer name must start with a letter or underscore and contain only letters, digits, underscore, or hyphen.");
  }
}

function validateAutomouseLayerValue(raw, layerCount = 99) {
  const text = String(raw || "").trim();
  if (!/^\d+$/.test(text)) throw new Error("automouse-layer must be a non-negative integer.");
  const n = Number(text);
  if (n < 0 || n >= layerCount) {
    throw new Error(`automouse-layer out of range.`);
  }
}

function validateScrollLayersValue(raw, layerCount = 99) {
  const text = String(raw || "").trim();
  if (!text) throw new Error("scroll-layers must not be empty.");
  if (text !== text.replace(/\s+/g, " ")) throw new Error("scroll-layers must be a single-space-separated list.");
  const layers = text.split(" ").map((value) => {
    if (!/^\d+$/.test(value)) throw new Error("scroll-layers must be integer layer indices.");
    return Number(value);
  });
  if (new Set(layers).size !== layers.length) throw new Error("scroll-layers must be unique.");
  if (layers.some((layer) => layer < 0 || layer >= layerCount)) {
    throw new Error(`scroll-layers out of range.`);
  }
}

function validateSensorBindingPreserved(source, change) {
  const nextSource = `${source.slice(0, change.range.start)}${change.nextRaw}${source.slice(change.range.end)}`;
  const afterParsed = parseKeymap(nextSource);
  const afterLayer = afterParsed.layers.find((layer) => layer.id === change.layerIndex);
  if (!afterLayer || !afterLayer.sensorBindings.length) {
    throw new Error("sensor-binding: sensor-binding missing after replacement.");
  }
  if (!/^&inc_dec_kp \S+ \S+$/.test(afterLayer.sensorBindings[0].raw.trim())) {
    throw new Error("sensor-binding: replacement did not produce a valid &inc_dec_kp expression.");
  }
}

function validateSensorBindingInserted(source, change) {
  const beforeParsed = parseKeymap(source);
  const nextSource = `${source.slice(0, change.range.start)}${change.nextRaw}${source.slice(change.range.end)}`;
  const afterParsed = parseKeymap(nextSource);
  const beforeLayer = beforeParsed.layers[change.layerIndex];
  const afterLayer = afterParsed.layers[change.layerIndex];
  if (!beforeLayer || !afterLayer) throw new Error("sensor-binding-insert target layer is missing.");
  if (beforeLayer.sensorBindings.length) {
    throw new Error("sensor-binding-insert target layer already has sensor-bindings.");
  }
  if (afterLayer.sensorBindings.length !== 1 || afterLayer.sensorBindings[0].behavior !== "&inc_dec_kp") {
    throw new Error("sensor-binding-insert did not add a valid &inc_dec_kp binding.");
  }
}

function validateSensorBindingRemoved(source, change) {
  const beforeParsed = parseKeymap(source);
  const nextSource = `${source.slice(0, change.range.start)}${change.nextRaw}${source.slice(change.range.end)}`;
  const afterParsed = parseKeymap(nextSource);
  const beforeLayer = beforeParsed.layers[change.layerIndex];
  const afterLayer = afterParsed.layers[change.layerIndex];
  if (!beforeLayer || !afterLayer) throw new Error("sensor-binding-remove target layer is missing.");
  if (!beforeLayer.sensorBindings.length) {
    throw new Error("sensor-binding-remove target layer has no sensor-bindings.");
  }
  if (afterLayer.sensorBindings.length) {
    throw new Error("sensor-binding-remove did not remove sensor-bindings from the target layer.");
  }
}

function validateSensorBindingInsertionContent(nextRaw) {
  const match = String(nextRaw || "").match(/sensor-bindings\s*=\s*<([^<>;\r\n]+)>;\r?\n$/);
  if (!match || !/^&inc_dec_kp \S+ \S+$/.test(match[1].trim())) {
    throw new Error("sensor-binding-insert content is invalid.");
  }
}

function validateTrackballSettingsPreserved(source, change) {
  const nextSource = `${source.slice(0, change.range.start)}${change.nextRaw}${source.slice(change.range.end)}`;
  const afterParsed = parseKeymap(nextSource);
  if (!afterParsed.trackballSettings) {
    throw new Error(`${change.kind}: trackball settings missing after replacement.`);
  }
  if (change.kind === "trackball-automouse-layer" && !afterParsed.trackballSettings.automouseLayer) {
    throw new Error("trackball-automouse-layer: automouse-layer property missing after replacement.");
  }
  if (change.kind === "trackball-scroll-layers" && !afterParsed.trackballSettings.scrollLayers) {
    throw new Error("trackball-scroll-layers: scroll-layers property missing after replacement.");
  }
}

function validateMacroBindingsReplacement(currentRaw, nextRaw) {
  const currentEntries = splitBindingExpressions(currentRaw);
  const nextEntries = splitBindingExpressions(nextRaw);
  if (!nextEntries.length) throw new Error("Macro bindings must include at least one binding.");
  if (nextEntries.join(" ") !== String(nextRaw || "").trim().replace(/\s+/g, " ")) {
    throw new Error("Macro bindings must be a single-space-separated list.");
  }
  for (let index = 0; index < nextEntries.length; index += 1) {
    const entry = nextEntries[index];
    if (isEditableBindingExpression(entry)) continue;
    if (entry === currentEntries[index]) continue;
    throw new Error("macro-bindings-replace contains an unsupported changed binding.");
  }
}

function splitBindingExpressions(raw) {
  return String(raw || "")
    .trim()
    .match(/&[^&]+(?=\s*&|$)/g)
    ?.map((entry) => entry.trim().replace(/\s+/g, " ")) || [];
}
