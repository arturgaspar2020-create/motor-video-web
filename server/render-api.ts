import type { Plugin } from "vite";
import Busboy from "busboy";
import { spawn } from "node:child_process";
import { createWriteStream, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";

function runRenderer(args: string[], cwd: string) {
  return new Promise<{ code: number; log: string }>((resolve, reject) => {
    const child = spawn(process.platform === "win32" ? "python" : "python3", args, { cwd, windowsHide: true });
    let log = "";
    child.stdout.on("data", chunk => { log += chunk.toString(); });
    child.stderr.on("data", chunk => { log += chunk.toString(); });
    child.on("error", reject);
    child.on("close", code => resolve({ code: code ?? 1, log }));
  });
}

export function renderApi(): Plugin {
  return {
    name: "motor-video-render-api",
    configureServer(server) {
      server.middlewares.use("/api/render", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405; res.end("Use POST"); return;
        }
        const work = await fs.mkdtemp(path.join(os.tmpdir(), "motor-video-studio-"));
        try {
          const fields: Record<string, string> = {};
          let audioPath = "";
          const bb = Busboy({ headers: req.headers, limits: { files: 1, fileSize: 1024 * 1024 * 1024, fields: 10 } });
          const writes: Promise<unknown>[] = [];
          bb.on("field", (name, value) => { fields[name] = value; });
          bb.on("file", (name, stream, info) => {
            if (name !== "audio") { stream.resume(); return; }
            audioPath = path.join(work, path.basename(info.filename || "narration.mp3"));
            writes.push(pipeline(stream, createWriteStream(audioPath)));
          });
          const parsed = new Promise<void>((resolve, reject) => {
            bb.on("close", resolve);
            bb.on("error", reject);
            req.pipe(bb);
          });
          await parsed;
          await Promise.all(writes);
          if (!fields.project || !audioPath) throw new Error("Envie o projeto e o áudio da narração.");
          const projectPath = path.join(work, "project.json");
          const outputPath = path.join(work, "render.mp4");
          const project = JSON.parse(fields.project);
          if (!project.script || typeof project.script !== "string") throw new Error("O projeto não contém roteiro válido.");
          await fs.writeFile(projectPath, JSON.stringify(project), "utf8");
          const width = Number(fields.width || 1920);
          const height = Number(fields.height || 1080);
          const fps = Number(fields.fps || 30);
          const renderer = path.resolve(process.cwd(), "engine", "render.py");
          const result = await runRenderer([renderer, "--project", projectPath, "--audio", audioPath, "--output", outputPath, "--width", String(width), "--height", String(height), "--fps", String(fps)], process.cwd());
          if (result.code !== 0) throw new Error(result.log || "O renderizador falhou.");
          const video = await fs.readFile(outputPath);
          res.statusCode = 200;
          res.setHeader("Content-Type", "video/mp4");
          res.setHeader("Content-Disposition", 'attachment; filename="motor-video-final.mp4"');
          res.setHeader("X-Render-Log", Buffer.from(result.log).toString("base64"));
          res.end(video);
        } catch (error) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido ao renderizar." }));
        } finally {
          await fs.rm(work, { recursive: true, force: true }).catch(() => undefined);
        }
      });
    }
  };
}
