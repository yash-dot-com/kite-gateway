import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../../src/db/schema.js";
import { initializeSchema } from "../../src/db/connection.js";
import { createToolExecutors, runAgentLoop } from "../../src/admin/ai-ops.js";

function createTestDb() {
  const sqlite = new Database(":memory:");
  initializeSchema(sqlite);
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

function seedTestData(db: ReturnType<typeof drizzle<typeof schema>>) {
  // Seed routes
  db.insert(schema.routes).values([
    { path: "/api/users/*", target: "http://localhost:4001", methods: '["GET","POST"]', authRequired: true, rateLimit: 200 },
    { path: "/api/products/*", target: "http://localhost:4002", methods: '["GET"]', authRequired: false, rateLimit: 500 },
  ]).run();

  // Seed logs
  db.insert(schema.requestLogs).values([
    { method: "GET", path: "/api/users/1", statusCode: 200, responseTimeMs: 45, clientIp: "10.0.0.1" },
    { method: "POST", path: "/api/users", statusCode: 201, responseTimeMs: 120, clientIp: "10.0.0.1" },
    { method: "GET", path: "/api/users/999", statusCode: 404, responseTimeMs: 15, clientIp: "10.0.0.2" },
    { method: "GET", path: "/api/products", statusCode: 200, responseTimeMs: 30, clientIp: "10.0.0.3" },
    { method: "GET", path: "/api/users/1", statusCode: 500, responseTimeMs: 2000, clientIp: "10.0.0.1" },
  ]).run();

  // Seed metrics
  db.insert(schema.metrics).values([
    {
      routePath: "/api/users/*", totalRequests: 100, successCount: 90, errorCount: 10,
      avgResponseTimeMs: 85.5, p95ResponseTimeMs: 250, minResponseTimeMs: 10, maxResponseTimeMs: 2000,
      windowStart: "2025-01-01T00:00:00Z", windowEnd: "2025-01-01T01:00:00Z",
    },
    {
      routePath: "/api/products/*", totalRequests: 50, successCount: 49, errorCount: 1,
      avgResponseTimeMs: 25.0, p95ResponseTimeMs: 80, minResponseTimeMs: 5, maxResponseTimeMs: 200,
      windowStart: "2025-01-01T00:00:00Z", windowEnd: "2025-01-01T01:00:00Z",
    },
  ]).run();
}

describe("AI Ops Tools", () => {
  it("search_logs tool returns correct filtered results from DB", () => {
    const { db, sqlite } = createTestDb();
    seedTestData(db);
    const executors = createToolExecutors(db, Date.now());

    const allLogs = executors.search_logs({}) as unknown[];
    assert.equal(allLogs.length, 5);

    const errorLogs = executors.search_logs({ error_only: true }) as unknown[];
    assert.equal(errorLogs.length, 2); // 404 + 500

    const getUserLogs = executors.search_logs({ method: "GET", path: "/api/users/1" }) as unknown[];
    assert.equal(getUserLogs.length, 2);

    sqlite.close();
  });

  it("query_metrics tool returns aggregated metrics", () => {
    const { db, sqlite } = createTestDb();
    seedTestData(db);
    const executors = createToolExecutors(db, Date.now());

    const allMetrics = executors.query_metrics({}) as unknown[];
    assert.equal(allMetrics.length, 2);

    const sorted = executors.query_metrics({ sort_by: "error_count" }) as { errorCount: number }[];
    assert.equal(sorted[0].errorCount, 10); // users has more errors

    sqlite.close();
  });

  it("get_routes tool returns all routes", () => {
    const { db, sqlite } = createTestDb();
    seedTestData(db);
    const executors = createToolExecutors(db, Date.now());

    const allRoutes = executors.get_routes() as { path: string; methods: string[] }[];
    assert.equal(allRoutes.length, 2);
    assert.equal(allRoutes[0].path, "/api/users/*");
    assert.ok(Array.isArray(allRoutes[0].methods)); // methods should be parsed from JSON

    sqlite.close();
  });

  it("get_error_summary tool groups errors by path + status", () => {
    const { db, sqlite } = createTestDb();
    seedTestData(db);
    const executors = createToolExecutors(db, Date.now());

    const summary = executors.get_error_summary({}) as { path: string; status_code: number; count: number }[];
    assert.ok(summary.length >= 2); // 404 on /api/users/999 and 500 on /api/users/1

    sqlite.close();
  });

  it("error maps respect the requested time range and parameterize tool inputs", () => {
    const { db, sqlite } = createTestDb();
    try {
      db.insert(schema.requestLogs).values([
        { method: "GET", path: "/older", statusCode: 500, responseTimeMs: 10, clientIp: "127.0.0.1", timestamp: "2026-10-19T10:00:00Z" },
        { method: "GET", path: "/recent", statusCode: 401, responseTimeMs: 10, clientIp: "127.0.0.1", timestamp: "2026-10-19T11:00:00Z" },
      ]).run();
      const executors = createToolExecutors(db, Date.now());
      assert.deepEqual(executors.get_error_summary({ from: "2026-10-19T10:30:00Z", to: "2026-10-19T11:30:00Z" }), [
        { path: "/recent", status_code: 401, count: 1 },
      ]);
      assert.deepEqual(executors.get_error_summary({ to: "' OR 1=1 --" }), []);
    } finally {
      sqlite.close();
    }
  });

  it("agent receives diagram instructions and returns fenced diagrams after querying tools", async (t) => {
    const { db, sqlite } = createTestDb();
    seedTestData(db);
    const answer = 'Configured topology:\n```mermaid\nflowchart TD\nA["Gateway"] --> B["http://localhost:4001"]\n```';
    let calls = 0;
    t.mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      assert.match(body.messages[0].content, /Pele/);
      assert.match(body.messages[0].content, /Current UTC time:/);
      assert.match(body.messages[0].content, /not a distributed trace/);
      const message = calls++ === 0
        ? { role: "assistant", content: null, tool_calls: [{ id: "routes-diagram", type: "function", function: { name: "get_routes", arguments: "{}" } }] }
        : { role: "assistant", content: answer };
      if (calls === 2) {
        const result = JSON.parse(body.messages.find((item: { role: string }) => item.role === "tool").content);
        assert.equal(result[0].target, "http://localhost:4001");
      }
      return new Response(JSON.stringify({ choices: [{ message }] }), { headers: { "Content-Type": "application/json" } });
    });
    try {
      assert.equal(await runAgentLoop("Show my route map", db, "test-key", "test-model", Date.now()), answer);
      assert.equal(calls, 2);
    } finally {
      sqlite.close();
    }
  });
});
