import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createMockReqRes } from "../helpers.js";
import { createContext } from "../../src/core/context.js";
import { createJwtAuthMiddleware } from "../../src/middleware/jwt-auth.js";
import { signJwt } from "../../src/utils/jwt.js";
import type { Route } from "../../src/core/types.js";

const SECRET = "test-secret-key-that-is-at-least-32-characters-long";
const ISSUER = "kite-test";

function makeCtxWithAuth(headers: Record<string, string>, route?: Partial<Route>) {
  const { req, res } = createMockReqRes({ headers });
  const ctx = createContext(req, res);
  if (route) {
    ctx.state.route = {
      id: 1, path: "/test", target: "http://localhost:9999",
      methods: ["GET"], rateLimit: 100,
      authRequired: route.authRequired ?? true,
      ...route,
    } as Route;
  }
  return { ctx, res };
}

describe("JWT Auth Middleware", () => {
  const auth = createJwtAuthMiddleware(SECRET, ISSUER);

  it("valid token → next() called, ctx.state.userId set", async () => {
    const token = signJwt({ sub: "user-42", iss: ISSUER }, SECRET);
    const { ctx } = makeCtxWithAuth({ authorization: `Bearer ${token}` });
    let nextCalled = false;

    await auth(ctx, async () => { nextCalled = true; });

    assert.ok(nextCalled);
    assert.equal(ctx.state.userId, "user-42");
  });

  it("missing Authorization header → 401 response", async () => {
    const { ctx, res } = makeCtxWithAuth({});
    let nextCalled = false;

    await auth(ctx, async () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res._statusCode, 401);
    assert.ok(res._body.includes("Missing Authorization"));
  });

  it('malformed header (no "Bearer" prefix) → 401', async () => {
    const { ctx, res } = makeCtxWithAuth({ authorization: "Basic abc123" });
    let nextCalled = false;

    await auth(ctx, async () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res._statusCode, 401);
  });

  it("expired token → 401 with 'Token expired' message", async () => {
    const token = signJwt({ sub: "user-1", iss: ISSUER }, SECRET, -10);
    const { ctx, res } = makeCtxWithAuth({ authorization: `Bearer ${token}` });

    await auth(ctx, async () => {});

    assert.equal(res._statusCode, 401);
    assert.ok(res._body.includes("Token expired"));
  });

  it("invalid signature → 401", async () => {
    const token = signJwt({ sub: "user-1", iss: ISSUER }, "wrong-secret-that-is-also-32-characters");
    const { ctx, res } = makeCtxWithAuth({ authorization: `Bearer ${token}` });

    await auth(ctx, async () => {});

    assert.equal(res._statusCode, 401);
  });

  it("route with authRequired: false → skips auth, calls next()", async () => {
    const { ctx } = makeCtxWithAuth({}, { authRequired: false });
    let nextCalled = false;

    await auth(ctx, async () => { nextCalled = true; });

    assert.ok(nextCalled);
  });
});
