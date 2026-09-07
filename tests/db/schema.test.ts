import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "../../src/db/schema.js";
import { initializeSchema } from "../../src/db/connection.js";
import { seedFromConfig } from "../../src/db/seed.js";
import type { KiteConfig } from "../../src/core/types.js";

function createTestDb() {
  const sqlite = new Database(":memory:");
  initializeSchema(sqlite);
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

const TEST_CONFIG: KiteConfig = {
  gateway: { port: 3000, adminPort: 3001 },
  jwt: {
    secret: "test-secret-key-that-is-at-least-32-characters-long",
    issuer: "kite-test",
    expiresInSeconds: 3600,
  },
  cors: {
    allowedOrigins: ["*"],
    allowedMethods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    maxAge: 86400,
  },
  rateLimiting: { windowMs: 60000, defaultMaxRequests: 100 },
  routes: [
    {
      path: "/api/users/*",
      target: "http://localhost:4001",
      methods: ["GET", "POST"],
      authRequired: true,
      rateLimit: 200,
      stripPrefix: "/api/users",
    },
    {
      path: "/api/products/*",
      target: "http://localhost:4002",
      methods: ["GET"],
      authRequired: false,
      rateLimit: 500,
    },
  ],
  groq: { apiKey: "test-key", model: "test-model" },
};

describe("Database Schema", () => {
  it("all 4 tables exist after schema initialization", () => {
    const { sqlite } = createTestDb();
    const tables = sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      )
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name).sort();
    assert.deepEqual(tableNames, [
      "jwt_keys",
      "metrics",
      "request_logs",
      "routes",
    ]);
    sqlite.close();
  });

  it("insert + select on routes table works", () => {
    const { db, sqlite } = createTestDb();
    db.insert(schema.routes)
      .values({
        path: "/test/*",
        target: "http://localhost:9999",
        methods: '["GET"]',
        authRequired: true,
        rateLimit: 100,
      })
      .run();

    const rows = db.select().from(schema.routes).all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].path, "/test/*");
    assert.equal(rows[0].target, "http://localhost:9999");
    sqlite.close();
  });

  it("insert + select on requestLogs table works", () => {
    const { db, sqlite } = createTestDb();
    db.insert(schema.requestLogs)
      .values({
        method: "GET",
        path: "/api/test",
        statusCode: 200,
        responseTimeMs: 42,
        clientIp: "127.0.0.1",
      })
      .run();

    const rows = db.select().from(schema.requestLogs).all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].statusCode, 200);
    assert.equal(rows[0].responseTimeMs, 42);
    sqlite.close();
  });

  it("insert + select on metrics table works", () => {
    const { db, sqlite } = createTestDb();
    db.insert(schema.metrics)
      .values({
        routePath: "/api/test",
        totalRequests: 100,
        successCount: 95,
        errorCount: 5,
        avgResponseTimeMs: 45.5,
        p95ResponseTimeMs: 120.0,
        minResponseTimeMs: 10,
        maxResponseTimeMs: 500,
        windowStart: "2025-01-01T00:00:00Z",
        windowEnd: "2025-01-01T01:00:00Z",
      })
      .run();

    const rows = db.select().from(schema.metrics).all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].totalRequests, 100);
    assert.equal(rows[0].avgResponseTimeMs, 45.5);
    sqlite.close();
  });

  it("seed function populates routes from config", async () => {
    const { db, sqlite } = createTestDb();
    await seedFromConfig(db, TEST_CONFIG);

    const routeRows = db.select().from(schema.routes).all();
    assert.equal(routeRows.length, 2);
    assert.equal(routeRows[0].path, "/api/users/*");
    assert.equal(routeRows[1].path, "/api/products/*");

    const keyRows = db.select().from(schema.jwtKeys).all();
    assert.equal(keyRows.length, 1);
    assert.equal(keyRows[0].name, "default");
    sqlite.close();
  });
});
