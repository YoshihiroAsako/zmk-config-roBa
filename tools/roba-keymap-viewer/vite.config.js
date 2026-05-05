import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { saveBindingChange, saveBindingChanges } from "./src/keymap/saveBindingChange.js";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(__dirname, "../..");
const keymapPath = path.join(repoRoot, "config", "roBa.keymap");
const drawerYamlPath = path.join(repoRoot, "keymap-drawer", "roBa.yaml");
const drawerSvgPath = path.join(repoRoot, "keymap-drawer", "roBa.svg");
const dtsiPath = path.join(repoRoot, "boards", "shields", "roBa", "roBa.dtsi");

export default defineConfig({
  plugins: [
    react(),
    {
      name: "roba-dev-save-api",
      configureServer(server) {
        server.middlewares.use("/__roba/keymap-source", async (request, response, next) => {
          if (request.method !== "GET") return next();

          try {
            const source = await readFile(keymapPath, "utf8");
            sendJson(response, 200, { ok: true, source });
          } catch (error) {
            sendJson(response, 500, { ok: false, message: error.message });
          }
        });

        server.middlewares.use("/__roba/save-binding", async (request, response, next) => {
          if (request.method !== "POST") return next();

          try {
            const body = await readJsonBody(request);
            const result = await saveBindingChange({
              repoRoot,
              sourcePath: body.sourcePath,
              range: body.range,
              currentRaw: body.currentRaw,
              nextRaw: body.nextRaw,
            });
            const source = await readFile(keymapPath, "utf8");
            sendJson(response, 200, { ...result, source });
          } catch (error) {
            sendJson(response, 400, { ok: false, message: error.message });
          }
        });

        server.middlewares.use("/__roba/save-bindings", async (request, response, next) => {
          if (request.method !== "POST") return next();

          try {
            const body = await readJsonBody(request);
            const result = await saveBindingChanges({
              repoRoot,
              sourcePath: body.sourcePath,
              changes: body.changes,
            });
            const source = await readFile(keymapPath, "utf8");
            sendJson(response, 200, { ...result, source });
          } catch (error) {
            sendJson(response, 400, { ok: false, message: error.message });
          }
        });

        server.middlewares.use("/__roba/update-keymap-drawer", async (request, response, next) => {
          if (request.method !== "POST") return next();

          try {
            const result = await updateKeymapDrawer();
            sendJson(response, 200, result);
          } catch (error) {
            sendJson(response, 500, { ok: false, available: true, message: error.message });
          }
        });
      },
    },
  ],
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
});

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

async function isKeymapAvailable() {
  try {
    await execFileAsync("keymap", ["--version"], { shell: true, timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function updateKeymapDrawer() {
  if (!(await isKeymapAvailable())) {
    return {
      ok: false,
      available: false,
      message: "keymap CLI not found on PATH. Update keymap-drawer manually.",
    };
  }

  const keymapEnv = { ...process.env, PYTHONUTF8: "1" };

  try {
    const { stdout: yaml } = await execFileAsync(
      "keymap",
      ["parse", "-c", "10", "-z", keymapPath],
      { shell: true, maxBuffer: 16 * 1024 * 1024, env: keymapEnv },
    );
    await writeFile(drawerYamlPath, yaml, "utf8");

    const { stdout: svg } = await execFileAsync(
      "keymap",
      ["draw", "-d", dtsiPath, drawerYamlPath],
      { shell: true, maxBuffer: 16 * 1024 * 1024, env: keymapEnv },
    );
    await writeFile(drawerSvgPath, svg, "utf8");

    return {
      ok: true,
      available: true,
      message: "Updated keymap-drawer/roBa.yaml and roBa.svg.",
      yamlPath: path.relative(repoRoot, drawerYamlPath).replace(/\\/g, "/"),
      svgPath: path.relative(repoRoot, drawerSvgPath).replace(/\\/g, "/"),
    };
  } catch (error) {
    return {
      ok: false,
      available: true,
      message: `keymap-drawer update failed: ${error.message}`,
    };
  }
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });
    request.on("error", reject);
  });
}
