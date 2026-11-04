import type { Plugin } from "vite";
import Busboy from "busboy";
import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, createReadStream, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";

type Job = {
  id: string;
  status: "preparing" | "rendering" | "completed" | "error" | "canceled";
  progress: number;
  currentScene: number;
  totalScenes: number;
  message: string;
  log: string;
  createdAt: string;
  outputPath: string;
  workDir: string;
  child?: ChildProcess;
  audioName: string;
  width: number;
  height: number;
  fps: number;
};

const jobs = new Map<string, Job>();
const MAX_LOG = 180_000;

function publicJob(job: Job) {
  return {
    id: job.id, status: job.status, progress: job.progress,
    currentScene: job.currentScene, totalScenes: job.totalScenes,
    message: job.message, log: job.log, createdAt: job.createdAt,
    audioName: job.audioName, width: job.width, height: job.height, fps: job.fps
  };
}

function appendLog(job: Job, chunk: string) {
  job.log = (job.log + chunk).slice(-MAX_LOG);
  const progressMatches = [...job.log.matchAll(/PROGRESS (\d+)%/g)];
  if (progressMatches.length) {
    job.progress = Math.min(99, Number(progressMatches[progressMatches.length - 1][1]));
    job.currentScene = job.totalScenes ? Math.min(job.totalScenes, Math.ceil(job.totalScenes * job.progress / 100)) : 0;
    job.message = `Renderização 3D: ${job.progress}%`;
  }
}

async function removeJobFiles(job: Job) {
  if (job.workDir) await fs.rm(job.workDir, { recursive: true, force: true }).catch(() => undefined);
}

export function renderApi(): Plugin {
  return {
    name: "motor-video-render-api",
    configureServer(server) {
      server.middlewares.use("/api/render", (req, res) => {
        const route = (req.url || "/").split("?")[0];
        const parts = route.split("/").filter(Boolean);
        const id = parts[0];

        const sendJson = (code: number, value: unknown) => {
          res.statusCode = code;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(value));
        };

        if (req.method === "POST" && !id) {
          void (async () => {
            const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "motor-video-studio-"));
            let audioPath = "";
            const fields: Record<string, string> = {};
            const writes: Promise<unknown>[] = [];
            try {
              const bb = Busboy({ headers: req.headers, limits: { files: 1, fileSize: 1024 * 1024 * 1024, fields: 10 } });
              bb.on("field", (name, value) => { fields[name] = value; });
              bb.on("file", (name, stream, info) => {
                if (name !== "audio") { stream.resume(); return; }
                audioPath = path.join(workDir, path.basename(info.filename || "narration.mp3"));
                writes.push(pipeline(stream, createWriteStream(audioPath)));
              });
              await new Promise<void>((resolve, reject) => {
                bb.on("close", resolve);
                bb.on("error", reject);
                req.pipe(bb);
              });
              await Promise.all(writes);
              if (!fields.project || !audioPath) throw new Error("Envie o projeto e o áudio da narração.");
              const project = JSON.parse(fields.project);
              if (!project.script || typeof project.script !== "string") throw new Error("O projeto não contém roteiro válido.");
              const jobId = randomUUID();
              const width = Number(fields.width || 1920);
              const height = Number(fields.height || 1080);
              const fps = Number(fields.fps || 30);
              const outputPath = path.join(workDir, "render.mp4");
              const projectPath = path.join(workDir, "project.json");
              await fs.writeFile(projectPath, JSON.stringify(project), "utf8");
              const job: Job = {
                id: jobId, status: "rendering", progress: 0, currentScene: 0,
                totalScenes: (project.script.match(/^\s*\[cena:/gim) || []).length,
                message: "Iniciando renderização...", log: "", createdAt: new Date().toISOString(),
                outputPath, workDir, audioName: path.basename(audioPath), width, height, fps
              };
              jobs.set(jobId, job);
              const renderer = path.resolve(process.cwd(), "engine", "render-3d.mjs");
              const child = spawn(process.execPath,
                [renderer, "--project", projectPath, "--audio", audioPath, "--output", outputPath,
                  "--width", String(width), "--height", String(height), "--fps", String(fps)],
                { cwd: process.cwd(), windowsHide: true });
              job.child = child;
              child.stdout.on("data", chunk => appendLog(job, chunk.toString()));
              child.stderr.on("data", chunk => appendLog(job, chunk.toString()));
              child.on("error", error => {
                job.status = "error"; job.message = "Não foi possível iniciar o renderizador Remotion/3D.";
                appendLog(job, "\nERRO AO INICIAR: " + error.message);
                void removeJobFiles(job);
              });
              child.on("close", async code => {
                job.child = undefined;
                if (job.status === "canceled") { job.message = "Renderização interrompida pelo usuário."; await removeJobFiles(job); return; }
                if (code === 0) {
                  job.status = "completed"; job.progress = 100; job.message = "Vídeo concluído e pronto para baixar.";
                } else {
                  job.status = "error"; job.message = "A renderização falhou. Consulte os detalhes do erro.";
                  if (!job.log.trim()) appendLog(job, `Processo Remotion encerrado com código ${code ?? "desconhecido"}.`);
                  await removeJobFiles(job);
                }
              });
              sendJson(202, publicJob(job));
            } catch (error) {
              await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
              sendJson(400, { error: error instanceof Error ? error.message : "Erro ao preparar a renderização." });
            }
          })().catch(error => sendJson(500, { error: error instanceof Error ? error.message : "Erro interno." }));
          return;
        }

        const job = id ? jobs.get(id) : undefined;
        if (!job) { sendJson(404, { error: "Trabalho não encontrado ou já removido." }); return; }

        if (req.method === "GET" && parts[1] === "download") {
          if (job.status !== "completed") { sendJson(409, { error: "Este vídeo ainda não está pronto." }); return; }
          res.statusCode = 200;
          res.setHeader("Content-Type", "video/mp4");
          res.setHeader("Content-Disposition", 'attachment; filename="motor-video-final.mp4"');
          const stream = createReadStream(job.outputPath);
          stream.on("error", error => {
            if (!res.headersSent) sendJson(500, { error: "Não foi possível ler o MP4: " + error.message });
            else res.destroy(error);
          });
          stream.on("close", async () => {
            jobs.delete(job.id);
            await removeJobFiles(job);
          });
          stream.pipe(res);
          return;
        }

        if (req.method === "POST" && parts[1] === "cancel") {
          if (job.status === "rendering" || job.status === "preparing") {
            job.status = "canceled";
            job.message = "Solicitando interrupção...";
            job.child?.kill();
            if (!job.child) void removeJobFiles(job);
          }
          sendJson(200, publicJob(job));
          return;
        }

        if (req.method === "GET" && parts.length === 1) { sendJson(200, publicJob(job)); return; }
        sendJson(404, { error: "Rota não encontrada." });
      });
    }
  };
}
