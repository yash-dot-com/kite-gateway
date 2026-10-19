import { it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { startServers } from "../../src/core/server.js";
import { closeDb } from "../../src/db/connection.js";
import { KiteConfigSchema } from "../../src/core/types.js";

it("gateway keeps public routes public, protects private routes, and exposes current metrics", async () => {
  const backend = http.createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    res.writeHead(req.url === "/error" ? 500 : req.method === "POST" ? 201 : 200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ path: req.url, body: Buffer.concat(chunks).toString() }));
  });
  backend.listen(0, "127.0.0.1");
  await once(backend, "listening");
  const backendPort = (backend.address() as { port: number }).port;
  const config = KiteConfigSchema.parse({
    gateway: {},
    jwt: { secret: "test-secret-key-at-least-32-characters-long" },
    cors: {},
    rateLimiting: {},
    routes: [
      { path: "/api/products/*", target: `http://127.0.0.1:${backendPort}`, methods: ["GET", "POST"], authRequired: false, stripPrefix: "/api/products" },
      { path: "/api/users/*", target: `http://127.0.0.1:${backendPort}`, methods: ["GET"], authRequired: true, stripPrefix: "/api/users" },
    ],
    groq: { apiKey: "" },
  });
  config.gateway = { port: 0, adminPort: 0 };
  const oldDbPath = process.env.DB_PATH;
  process.env.DB_PATH = ":memory:";
  let servers: Awaited<ReturnType<typeof startServers>> | undefined;
  try {
    servers = await startServers(config);
    await Promise.all([servers.gatewayServer, servers.adminServer].map(server => server.listening ? undefined : once(server, "listening")));
    const gateway = `http://127.0.0.1:${(servers.gatewayServer.address() as { port: number }).port}`;
    const admin = `http://127.0.0.1:${(servers.adminServer.address() as { port: number }).port}`;

    const publicResponse = await fetch(`${gateway}/api/products/123`);
    assert.equal(publicResponse.status, 200);
    assert.equal((await publicResponse.json()).path, "/123");

    const unauthorized = await fetch(`${gateway}/api/users/123`);
    assert.equal(unauthorized.status, 401);
    await unauthorized.text();

    const tokenResponse = await fetch(`${admin}/admin/jwt/sign`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sub: "demo-developer" }),
    });
    const { token } = await tokenResponse.json();
    const authorized = await fetch(`${gateway}/api/users/123`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(authorized.status, 200);
    await authorized.text();

    const post = await fetch(`${gateway}/api/products/123`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: '{"hello":"kite"}',
    });
    assert.equal(post.status, 201);
    assert.equal((await post.json()).body, '{"hello":"kite"}');

    const error = await fetch(`${gateway}/api/products/error`);
    assert.equal(error.status, 500);
    await error.text();

    const metrics = await (await fetch(`${admin}/admin/metrics`)).json();
    assert.equal(metrics.reduce((sum: number, metric: { totalRequests: number }) => sum + metric.totalRequests, 0), 5);
    assert.equal(metrics.find((metric: { routePath: string }) => metric.routePath === "/api/users/*").errorCount, 1);
    const metricsAgain = await (await fetch(`${admin}/admin/metrics`)).json();
    assert.equal(metricsAgain.length, metrics.length, "refresh must not duplicate already flushed requests");
    const health = await (await fetch(`${admin}/admin/health`)).json();
    assert.equal(health.totalRequests, 5);
    const logs = await (await fetch(`${admin}/admin/logs`)).json();
    assert.equal(logs[0].statusCode, 500);
    assert.equal(logs.length, 5);
  } finally {
    if (servers) {
      await Promise.all([servers.gatewayServer, servers.adminServer].map(server => new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      })));
    }
    await new Promise<void>(resolve => backend.close(() => resolve()));
    closeDb();
    if (oldDbPath === undefined) delete process.env.DB_PATH;
    else process.env.DB_PATH = oldDbPath;
  }
});
