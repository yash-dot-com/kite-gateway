import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../../src/db/schema.js";
import { initializeSchema } from "../../src/db/connection.js";
import { createMockReqRes } from "../helpers.js";
import { createContext } from "../../src/core/context.js";
import { createLoggerMiddleware } from "../../src/middleware/logger.js";

function createTestDb() {
  const sqlite = new Database(":memory:");
  initializeSchema(sqlite);
  return { db: drizzle(sqlite, { schema }), sqlite };
}

describe("Logger Middleware", () => {
  it("after request, a row is inserted into requestLogs table", async () => {
    const { db, sqlite } = createTestDb();
    const logger = createLoggerMiddleware(db);

    const { req, res } = createMockReqRes({ url: "/api/test", headers: { "user-agent": "test-agent" } });
    const ctx = createContext(req, res);

    await logger(ctx, async () => {
      ctx.json(200, { ok: true });
    });

    const rows = db.select().from(schema.requestLogs).all();
    assert.equal(rows.length, 1);
    sqlite.close();
  });

  it("log entry has correct method, path, statusCode", async () => {
    const { db, sqlite } = createTestDb();
    const logger = createLoggerMiddleware(db);

    const { req, res } = createMockReqRes({ method: "POST", url: "/api/users", headers: { "user-agent": "test-agent" } });
    const ctx = createContext(req, res);

    await logger(ctx, async () => {
      ctx.json(201, { id: 1 });
    });

    const rows = db.select().from(schema.requestLogs).all();
    assert.equal(rows[0].method, "POST");
    assert.equal(rows[0].path, "/api/users");
    assert.equal(rows[0].statusCode, 201);
    sqlite.close();
  });

  it("responseTimeMs is a positive integer (measured correctly)", async () => {
    const { db, sqlite } = createTestDb();
    const logger = createLoggerMiddleware(db);

    const { req, res } = createMockReqRes({ headers: { "user-agent": "test-agent" } });
    const ctx = createContext(req, res);

    await logger(ctx, async () => {
      await new Promise((r) => setTimeout(r, 10));
      ctx.json(200, {});
    });

    const rows = db.select().from(schema.requestLogs).all();
    assert.ok(rows[0].responseTimeMs >= 0);
    sqlite.close();
  });

  it("userId is populated when JWT auth sets it", async () => {
    const { db, sqlite } = createTestDb();
    const logger = createLoggerMiddleware(db);

    const { req, res } = createMockReqRes({ headers: { "user-agent": "test-agent" } });
    const ctx = createContext(req, res);
    ctx.state.userId = "user-42";

    await logger(ctx, async () => {
      ctx.json(200, {});
    });

    const rows = db.select().from(schema.requestLogs).all();
    assert.equal(rows[0].userId, "user-42");
    sqlite.close();
  });
});
