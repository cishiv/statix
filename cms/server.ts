const HOSTNAME = "127.0.0.1";
const PORT = 5174;

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const { pathname } = url;

  if (pathname === "/api/health" && req.method === "GET") {
    return Response.json({ ok: true });
  }

  return new Response("Not found", { status: 404 });
}

const server = Bun.serve({
  hostname: HOSTNAME,
  port: PORT,
  fetch: (req) => handleRequest(req),
});

console.log(`statix cms → http://${server.hostname}:${server.port}`);
