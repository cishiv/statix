import path from "node:path";
import { existsSync } from "node:fs";
import { safeJoin } from "./path-safety.ts";
import {
  deleteDocFile,
  listDocs,
  readDocFile,
  writeDocFile,
} from "./api/docs.ts";
import { moveDoc } from "./api/move.ts";
import { renderPreview } from "./api/preview.ts";
import { listLinks } from "./api/links.ts";

const HOSTNAME = "127.0.0.1";
const PORT = 5174;
const DOCS_DIR = path.resolve("docs");

function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

async function handleDocRequest(
  req: Request,
  url: URL
): Promise<Response> {
  const rel = url.searchParams.get("path");
  if (!rel) return jsonError(400, "missing path");
  if (!rel.endsWith(".md")) return jsonError(400, "path must end in .md");
  const abs = safeJoin(DOCS_DIR, rel);
  if (!abs) return jsonError(400, "invalid path");

  if (req.method === "GET") {
    if (!existsSync(abs)) return jsonError(404, "not found");
    const body = await readDocFile(abs);
    return new Response(body, {
      headers: { "content-type": "text/markdown; charset=utf-8" },
    });
  }
  if (req.method === "PUT") {
    const body = await req.text();
    await writeDocFile(abs, body);
    return Response.json({ ok: true, path: rel });
  }
  if (req.method === "DELETE") {
    if (!existsSync(abs)) return jsonError(404, "not found");
    await deleteDocFile(abs);
    return Response.json({ ok: true });
  }
  return jsonError(405, "method not allowed");
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const { pathname } = url;
  const method = req.method;

  if (pathname === "/api/health" && method === "GET") {
    return Response.json({ ok: true });
  }

  if (pathname === "/api/tree" && method === "GET") {
    const docs = await listDocs(DOCS_DIR);
    return Response.json({ docs });
  }

  if (pathname === "/api/doc") {
    return handleDocRequest(req, url);
  }

  if (pathname === "/api/doc/move" && method === "POST") {
    return handleMoveRequest(req);
  }

  if (pathname === "/api/links" && method === "GET") {
    const links = await listLinks(DOCS_DIR);
    return Response.json({ links });
  }

  if (pathname === "/api/preview" && method === "POST") {
    return handlePreviewRequest(req);
  }

  return new Response("Not found", { status: 404 });
}

async function handlePreviewRequest(req: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonError(400, "invalid json");
  }
  const { body, path: rel } = (payload ?? {}) as {
    body?: unknown;
    path?: unknown;
  };
  if (typeof body !== "string" || typeof rel !== "string") {
    return jsonError(400, "body and path required");
  }
  if (!rel.endsWith(".md")) return jsonError(400, "path must end in .md");
  if (!safeJoin(DOCS_DIR, rel)) return jsonError(400, "invalid path");
  const html = await renderPreview(body, rel, DOCS_DIR);
  return Response.json({ html });
}

async function handleMoveRequest(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid json");
  }
  const { from, to } = (body ?? {}) as { from?: unknown; to?: unknown };
  if (typeof from !== "string" || typeof to !== "string") {
    return jsonError(400, "from and to are required strings");
  }
  if (!from.endsWith(".md") || !to.endsWith(".md")) {
    return jsonError(400, "paths must end in .md");
  }
  const fromAbs = safeJoin(DOCS_DIR, from);
  const toAbs = safeJoin(DOCS_DIR, to);
  if (!fromAbs || !toAbs) return jsonError(400, "invalid path");
  const result = await moveDoc(DOCS_DIR, fromAbs, toAbs);
  if (!result.ok) return jsonError(400, result.reason);
  return Response.json({ ok: true, rewrites: result.rewrites });
}

const server = Bun.serve({
  hostname: HOSTNAME,
  port: PORT,
  fetch: (req) => handleRequest(req),
});

console.log(`statix cms → http://${server.hostname}:${server.port}`);
