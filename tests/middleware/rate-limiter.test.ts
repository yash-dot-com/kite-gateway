import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMockReqRes } from "../helpers.js";
import { createContext } from "../../src/core/context.js";
import { createRateLimiter } from "../../src/middleware/rate-limiter.js";
import type { Route } from "../../src/core/types.js";

describe("Rate Limiter Middleware", () => {
  it("requests under limit → all pass through", async () => {
    const limiter = createRateLimiter({ windowMs: 60000, defaultMaxRequests: 5 });
    let passCount = 0;

    for (let i = 0; i < 5; i++) {
      const { req, res } = createMockReqRes();
      const ctx = createContext(req, res);
      await limiter(ctx, async () => { passCount++; });
    }

    assert.equal(passCount, 5);
  });

  it("request at limit+1 → 429 response with Retry-After header", async () => {
    const limiter = createRateLimiter({ windowMs: 60000, defaultMaxRequests: 3 });

    for (let i = 0; i < 3; i++) {
      const { req, res } = createMockReqRes();
      const ctx = createContext(req, res);
      await limiter(ctx, async () => {});
    }

    const { req, res } = createMockReqRes();
    const ctx = createContext(req, res);
    let nextCalled = false;
    await limiter(ctx, async () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res._statusCode, 429);
    assert.ok(res._headers["retry-after"]);
  });

  it("different IPs get independent counters", async () => {
    const limiter = createRateLimiter({ windowMs: 60000, defaultMaxRequests: 2 });

    for (let i = 0; i < 2; i++) {
      const { req, res } = createMockReqRes({ remoteAddress: "10.0.0.1" });
      const ctx = createContext(req, res);
      await limiter(ctx, async () => {});
    }

    const { req, res } = createMockReqRes({ remoteAddress: "10.0.0.2" });
    const ctx = createContext(req, res);
    let passed = false;
    await limiter(ctx, async () => { passed = true; });

    assert.ok(passed);
  });

  it("after window expires, counter resets", async () => {
    const limiter = createRateLimiter({ windowMs: 50, defaultMaxRequests: 1 });

    const { req: req1, res: res1 } = createMockReqRes();
    const ctx1 = createContext(req1, res1);
    await limiter(ctx1, async () => {});

    await new Promise((r) => setTimeout(r, 100));

    const { req: req2, res: res2 } = createMockReqRes();
    const ctx2 = createContext(req2, res2);
    let passed = false;
    await limiter(ctx2, async () => { passed = true; });

    assert.ok(passed);
  });

  it("authenticated user keyed by userId, not IP", async () => {
    const limiter = createRateLimiter({ windowMs: 60000, defaultMaxRequests: 2 });

    for (let i = 0; i < 2; i++) {
      const { req, res } = createMockReqRes();
      const ctx = createContext(req, res);
      ctx.state.userId = "user-A";
      await limiter(ctx, async () => {});
    }

    const { req, res } = createMockReqRes();
    const ctx = createContext(req, res);
    ctx.state.userId = "user-B";
    let passed = false;
    await limiter(ctx, async () => { passed = true; });

    assert.ok(passed);
  });

  it("route-specific rate limit overrides global default", async () => {
    const limiter = createRateLimiter({ windowMs: 60000, defaultMaxRequests: 100 });

    const route: Route = {
      id: 1, path: "/strict", target: "http://localhost:9999",
      methods: ["GET"], authRequired: false, rateLimit: 2,
    };

    for (let i = 0; i < 2; i++) {
      const { req, res } = createMockReqRes({ remoteAddress: `192.168.1.${i + 10}` });
      const ctx = createContext(req, res);
      ctx.state.route = route;
      ctx.state.userId = "same-user";
      await limiter(ctx, async () => {});
    }

    const { req, res } = createMockReqRes({ remoteAddress: "192.168.1.99" });
    const ctx = createContext(req, res);
    ctx.state.route = route;
    ctx.state.userId = "same-user";
    let nextCalled = false;
    await limiter(ctx, async () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res._statusCode, 429);
  });
});
