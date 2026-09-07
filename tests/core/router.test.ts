import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Router } from "../../src/core/router.js";
import type { Route } from "../../src/core/types.js";

function makeRoute(overrides: Partial<Route> & { path: string; methods?: string[] }): Route {
  return {
    id: 1,
    path: overrides.path,
    target: overrides.target || "http://localhost:9999",
    methods: overrides.methods || ["GET"],
    authRequired: overrides.authRequired ?? false,
    rateLimit: overrides.rateLimit ?? 100,
    stripPrefix: overrides.stripPrefix,
  };
}

describe("Trie Router", () => {
  it("exact match: GET /api/users resolves to the correct route", () => {
    const router = new Router();
    const route = makeRoute({ path: "/api/users", target: "http://a:1" });
    router.register(route);

    const match = router.lookup("GET", "/api/users");
    assert.ok(match);
    assert.equal(match.route.target, "http://a:1");
    assert.deepEqual(match.params, {});
  });

  it("parameterized: GET /api/users/42 extracts params.id = '42'", () => {
    const router = new Router();
    const route = makeRoute({ path: "/api/users/:id" });
    router.register(route);

    const match = router.lookup("GET", "/api/users/42");
    assert.ok(match);
    assert.equal(match.params.id, "42");
  });

  it("multi-param: GET /api/users/42/posts/7 extracts both params", () => {
    const router = new Router();
    const route = makeRoute({ path: "/api/users/:userId/posts/:postId" });
    router.register(route);

    const match = router.lookup("GET", "/api/users/42/posts/7");
    assert.ok(match);
    assert.equal(match.params.userId, "42");
    assert.equal(match.params.postId, "7");
  });

  it("wildcard: GET /api/docs/some/nested/path matches /api/docs/*", () => {
    const router = new Router();
    const route = makeRoute({ path: "/api/docs/*" });
    router.register(route);

    const match = router.lookup("GET", "/api/docs/some/nested/path");
    assert.ok(match);
    assert.equal(match.route.path, "/api/docs/*");
  });

  it("method filtering: POST /api/users matches POST route, not GET", () => {
    const router = new Router();
    const getRoute = makeRoute({ id: 1, path: "/api/users", methods: ["GET"], target: "http://get:1" } as Route);
    const postRoute = makeRoute({ id: 2, path: "/api/users", methods: ["POST"], target: "http://post:1" } as Route);
    router.register(getRoute);
    router.register(postRoute);

    const match = router.lookup("POST", "/api/users");
    assert.ok(match);
    assert.equal(match.route.target, "http://post:1");
  });

  it("no match: GET /nonexistent returns null", () => {
    const router = new Router();
    router.register(makeRoute({ path: "/api/users" }));

    const match = router.lookup("GET", "/nonexistent");
    assert.equal(match, null);
  });

  it("wrong method: DELETE /api/products returns null if only GET registered", () => {
    const router = new Router();
    router.register(makeRoute({ path: "/api/products", methods: ["GET"] }));

    const match = router.lookup("DELETE", "/api/products");
    assert.equal(match, null);
  });

  it("route priority: exact match wins over parameterized", () => {
    const router = new Router();
    const paramRoute = makeRoute({ path: "/api/users/:id", target: "http://param:1" });
    const exactRoute = makeRoute({ path: "/api/users/me", target: "http://exact:1" });
    router.register(paramRoute);
    router.register(exactRoute);

    const match = router.lookup("GET", "/api/users/me");
    assert.ok(match);
    assert.equal(match.route.target, "http://exact:1");
  });

  it("multiple routes: registering 10+ routes, all resolve correctly", () => {
    const router = new Router();
    for (let i = 0; i < 12; i++) {
      router.register(makeRoute({ path: `/svc${i}/endpoint`, target: `http://svc${i}:1` }));
    }

    for (let i = 0; i < 12; i++) {
      const match = router.lookup("GET", `/svc${i}/endpoint`);
      assert.ok(match, `Route /svc${i}/endpoint should match`);
      assert.equal(match.route.target, `http://svc${i}:1`);
    }
  });

  it("trailing slash normalization: /api/users/ matches /api/users", () => {
    const router = new Router();
    router.register(makeRoute({ path: "/api/users" }));

    const match = router.lookup("GET", "/api/users/");
    assert.ok(match);
  });
});
