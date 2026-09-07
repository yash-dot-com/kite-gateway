import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMockReqRes } from "../helpers.js";
import { createContext } from "../../src/core/context.js";
import { createCorsMiddleware } from "../../src/middleware/cors.js";

describe("CORS Middleware", () => {
  const cors = createCorsMiddleware({
    allowedOrigins: ["https://example.com", "https://app.example.com"],
    allowedMethods: ["GET", "POST", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  });

  const corsWildcard = createCorsMiddleware({
    allowedOrigins: ["*"],
    allowedMethods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    maxAge: 3600,
  });

  it("OPTIONS request → 204 with correct CORS headers", async () => {
    const { req, res } = createMockReqRes({
      method: "OPTIONS",
      headers: { origin: "https://example.com" },
    });
    const ctx = createContext(req, res);

    await cors(ctx, async () => {});

    assert.equal(res._statusCode, 204);
    assert.equal(res._headers["access-control-allow-origin"], "https://example.com");
    assert.ok(res._headers["access-control-allow-methods"]);
  });

  it("normal request → CORS headers added, next() called", async () => {
    const { req, res } = createMockReqRes({
      headers: { origin: "https://example.com" },
    });
    const ctx = createContext(req, res);
    let nextCalled = false;

    await cors(ctx, async () => { nextCalled = true; });

    assert.ok(nextCalled);
    assert.equal(res._headers["access-control-allow-origin"], "https://example.com");
  });

  it("disallowed origin → no Access-Control-Allow-Origin header", async () => {
    const { req, res } = createMockReqRes({
      headers: { origin: "https://evil.com" },
    });
    const ctx = createContext(req, res);

    await cors(ctx, async () => {});

    assert.equal(res._headers["access-control-allow-origin"], undefined);
  });

  it("Access-Control-Max-Age set from config", async () => {
    const { req, res } = createMockReqRes({
      method: "OPTIONS",
      headers: { origin: "https://example.com" },
    });
    const ctx = createContext(req, res);

    await cors(ctx, async () => {});

    assert.equal(res._headers["access-control-max-age"], "86400");
  });

  it("Access-Control-Allow-Methods matches configured methods", async () => {
    const { req, res } = createMockReqRes({
      headers: { origin: "https://example.com" },
    });
    const ctx = createContext(req, res);

    await corsWildcard(ctx, async () => {});

    assert.equal(res._headers["access-control-allow-methods"], "GET, POST");
  });
});
