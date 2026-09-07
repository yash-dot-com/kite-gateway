import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../../src/db/schema.js";
import { initializeSchema } from "../../src/db/connection.js";
import { createAdminHandlers } from "../../src/admin/handlers.js";
import { createContext } from "../../src/core/context.js";

const SECRET = "test-secret-key-that-is-at-least-32-characters-long";

function createTestDb() {
  const sqlite = new Database(":memory:");
  initializeSchema(sqlite);
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

function startAdminServer(db: ReturnType<typeof drizzle<typeof schema>>) {
  const router = createAdminHandlers(db, SECRET, "kite-test", 3600);

  return new Promise<{ port: number; close: () => Promise<void> }>((resolve) => {
    const server = http.createServer(async (req, res) => {
      const ctx = createContext(req, res);
      const handled = await router.handle(ctx);
      if (!handled) {
        ctx.json(404, { error: "Not found" });
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      resolve({
        port: addr.port,
        close: () => new Promise<void>((r) => server.close(() => r())),
      });
    });
  });
}

function request(
  port: number,
  method: string,
  path: string,
  body?: unknown
): Promise<{ statusCode: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers: {
          "content-type": "application/json",
          ...(payload ? { "content-length": Buffer.byteLength(payload).toString() } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString();
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ statusCode: res.statusCode || 0, body: parsed });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe("Admin API Handlers", () => {
  it("GET /admin/routes → 200 + array of routes", async () => {
    const { db, sqlite } = createTestDb();
    // Seed a route
    db.insert(schema.routes).values({
      path: "/api/test/*", target: "http://localhost:9999",
      methods: '["GET"]', authRequired: true, rateLimit: 100,
    }).run();

    const server = await startAdminServer(db);
    try {
      const res = await request(server.port, "GET", "/admin/routes");
      assert.equal(res.statusCode, 200);
      const body = res.body as unknown[];
      assert.ok(Array.isArray(body));
      assert.equal(body.length, 1);
    } finally {
      await server.close();
      sqlite.close();
    }
  });

  it("POST /admin/routes with valid body → 201 + new route returned", async () => {
    const { db, sqlite } = createTestDb();
    const server = await startAdminServer(db);

    try {
      const res = await request(server.port, "POST", "/admin/routes", {
        path: "/api/new/*",
        target: "http://localhost:5000",
        methods: ["GET", "POST"],
        authRequired: false,
        rateLimit: 50,
      });

      assert.equal(res.statusCode, 201);
      const body = res.body as { path: string; target: string };
      assert.equal(body.path, "/api/new/*");
      assert.equal(body.target, "http://localhost:5000");
    } finally {
      await server.close();
      sqlite.close();
    }
  });

  it("POST /admin/routes with invalid body → 400 + Zod error details", async () => {
    const { db, sqlite } = createTestDb();
    const server = await startAdminServer(db);

    try {
      const res = await request(server.port, "POST", "/admin/routes", {
        path: "",  // invalid — min 1 char
        target: "not-a-url",  // invalid URL
        methods: [],  // invalid — min 1
      });

      assert.equal(res.statusCode, 400);
      const body = res.body as { error: string };
      assert.equal(body.error, "Validation Error");
    } finally {
      await server.close();
      sqlite.close();
    }
  });

  it("PUT /admin/routes/:id → 200 + updated route", async () => {
    const { db, sqlite } = createTestDb();
    db.insert(schema.routes).values({
      path: "/api/old/*", target: "http://localhost:8000",
      methods: '["GET"]', authRequired: true, rateLimit: 100,
    }).run();

    const server = await startAdminServer(db);

    try {
      const res = await request(server.port, "PUT", "/admin/routes/1", {
        rateLimit: 999,
      });

      assert.equal(res.statusCode, 200);
      const body = res.body as { rateLimit: number };
      assert.equal(body.rateLimit, 999);
    } finally {
      await server.close();
      sqlite.close();
    }
  });

  it("DELETE /admin/routes/:id → 204", async () => {
    const { db, sqlite } = createTestDb();
    db.insert(schema.routes).values({
      path: "/api/delete/*", target: "http://localhost:8000",
      methods: '["GET"]', authRequired: true, rateLimit: 100,
    }).run();

    const server = await startAdminServer(db);

    try {
      const res = await request(server.port, "DELETE", "/admin/routes/1");
      assert.equal(res.statusCode, 204);

      // Verify deleted
      const check = await request(server.port, "GET", "/admin/routes");
      assert.equal((check.body as unknown[]).length, 0);
    } finally {
      await server.close();
      sqlite.close();
    }
  });

  it("GET /admin/logs → 200 + array of log entries", async () => {
    const { db, sqlite } = createTestDb();
    db.insert(schema.requestLogs).values({
      method: "GET", path: "/api/test", statusCode: 200,
      responseTimeMs: 42, clientIp: "127.0.0.1",
    }).run();

    const server = await startAdminServer(db);

    try {
      const res = await request(server.port, "GET", "/admin/logs");
      assert.equal(res.statusCode, 200);
      const body = res.body as unknown[];
      assert.ok(Array.isArray(body));
      assert.equal(body.length, 1);
    } finally {
      await server.close();
      sqlite.close();
    }
  });

  it("GET /admin/logs?status=500 → only 500-status logs returned", async () => {
    const { db, sqlite } = createTestDb();
    db.insert(schema.requestLogs).values([
      { method: "GET", path: "/ok", statusCode: 200, responseTimeMs: 10, clientIp: "1.1.1.1" },
      { method: "GET", path: "/err", statusCode: 500, responseTimeMs: 100, clientIp: "1.1.1.1" },
      { method: "GET", path: "/err2", statusCode: 500, responseTimeMs: 200, clientIp: "1.1.1.1" },
    ]).run();

    const server = await startAdminServer(db);

    try {
      const res = await request(server.port, "GET", "/admin/logs?status=500");
      assert.equal(res.statusCode, 200);
      const body = res.body as { statusCode: number }[];
      assert.equal(body.length, 2);
      for (const entry of body) {
        assert.equal(entry.statusCode, 500);
      }
    } finally {
      await server.close();
      sqlite.close();
    }
  });

  it("GET /admin/health → 200 + uptime, memory, routeCount fields", async () => {
    const { db, sqlite } = createTestDb();
    const server = await startAdminServer(db);

    try {
      const res = await request(server.port, "GET", "/admin/health");
      assert.equal(res.statusCode, 200);
      const body = res.body as { status: string; uptime: number; memory: object; routes: number };
      assert.equal(body.status, "healthy");
      assert.ok(typeof body.uptime === "number");
      assert.ok(body.memory);
      assert.ok(typeof body.routes === "number");
    } finally {
      await server.close();
      sqlite.close();
    }
  });
});
