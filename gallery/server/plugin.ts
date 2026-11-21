import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Plugin } from "vite";
import { listRuns, readRun, RunError, updateCase, type RunDirs } from "./runs.ts";

// Serves evals/results to the gallery during `vite` dev and `vite preview`.
export function runsApi(dirs: RunDirs): Plugin {
  const handler = createHandler(dirs);
  return {
    name: "ds-evals-runs-api",
    configureServer(server) {
      server.middlewares.use("/api", handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api", handler);
    },
  };
}

function createHandler(dirs: RunDirs): Connect.NextHandleFunction {
  return (req, res) => {
    void handle(dirs, req, res).catch((error: unknown) => {
      const status = error instanceof RunError ? error.status : error instanceof SyntaxError ? 400 : 500;
      send(res, status, { error: error instanceof Error ? error.message : String(error) });
    });
  };
}

async function handle(dirs: RunDirs, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const path = new URL(req.url ?? "/", "http://localhost").pathname;
  const segments = path.split("/").filter(Boolean).map(decodeURIComponent);
  const [resource, file, caseId, ...rest] = segments;

  if (resource !== "runs" || rest.length > 0) return send(res, 404, { error: "Not found" });

  if (req.method === "GET" && file === undefined) return send(res, 200, listRuns(dirs));
  if (req.method === "GET" && file !== undefined && caseId === undefined) return send(res, 200, readRun(dirs, file));
  if (req.method === "PATCH" && file !== undefined && caseId !== undefined) {
    return send(res, 200, updateCase(dirs, file, caseId, JSON.parse(await readBody(req))));
  }
  send(res, 405, { error: `${req.method} not allowed on ${path}` });
}

async function readBody(req: IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 10_000) throw new RunError(400, "Body too large.");
  }
  return body;
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}
