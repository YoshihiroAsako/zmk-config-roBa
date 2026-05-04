import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { saveBindingChange } from "./src/keymap/saveBindingChange.js";

const repoRoot = path.resolve(__dirname, "../..");
const keymapPath = path.join(repoRoot, "config", "roBa.keymap");

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
