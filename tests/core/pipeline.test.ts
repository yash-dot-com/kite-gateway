import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compose } from "../../src/core/pipeline.js";
import type { KiteContext, MiddlewareFn } from "../../src/core/types.js";

function mockCtx(state?: Record<string, unknown>): KiteContext {
  return {
    state: { startTime: 0n, requestId: "test", ...state },
  } as unknown as KiteContext;
}

describe("Middleware Pipeline", () => {
  it("middlewares execute in order (A → B → C)", async () => {
    const order: string[] = [];

    const a: MiddlewareFn = async (_ctx, next) => {
      order.push("A");
      await next();
    };
    const b: MiddlewareFn = async (_ctx, next) => {
      order.push("B");
      await next();
    };
    const c: MiddlewareFn = async (_ctx, next) => {
      order.push("C");
      await next();
    };

    const pipeline = compose([a, b, c]);
    await pipeline(mockCtx(), async () => {});

    assert.deepEqual(order, ["A", "B", "C"]);
  });

  it("each middleware can modify ctx.state for downstream", async () => {
    const ctx = mockCtx();

    const a: MiddlewareFn = async (c, next) => {
      c.state.fromA = true;
      await next();
    };
    const b: MiddlewareFn = async (c, next) => {
      c.state.fromB = true;
      await next();
    };

    await compose([a, b])(ctx, async () => {});

    assert.equal(ctx.state.fromA, true);
    assert.equal(ctx.state.fromB, true);
  });

  it("downstream middleware sees changes from upstream", async () => {
    const ctx = mockCtx();
    let sawValue = false;

    const a: MiddlewareFn = async (c, next) => {
      c.state.data = "hello";
      await next();
    };
    const b: MiddlewareFn = async (c, next) => {
      sawValue = c.state.data === "hello";
      await next();
    };

    await compose([a, b])(ctx, async () => {});
    assert.ok(sawValue);
  });

  it("upstream middleware sees changes after await next()", async () => {
    const ctx = mockCtx();
    let sawChange = false;

    const a: MiddlewareFn = async (c, next) => {
      await next();
      sawChange = c.state.addedByB === "yes";
    };
    const b: MiddlewareFn = async (c, next) => {
      c.state.addedByB = "yes";
      await next();
    };

    await compose([a, b])(ctx, async () => {});
    assert.ok(sawChange);
  });

  it("if a middleware doesn't call next(), downstream is skipped", async () => {
    let bCalled = false;

    const a: MiddlewareFn = async (_ctx, _next) => {
      // deliberately not calling next
    };
    const b: MiddlewareFn = async (_ctx, next) => {
      bCalled = true;
      await next();
    };

    await compose([a, b])(mockCtx(), async () => {});
    assert.equal(bCalled, false);
  });

  it("error thrown in middleware propagates up the chain", async () => {
    const a: MiddlewareFn = async (_ctx, next) => {
      await next();
    };
    const b: MiddlewareFn = async (_ctx, _next) => {
      throw new Error("boom");
    };

    await assert.rejects(
      () => compose([a, b])(mockCtx(), async () => {}),
      { message: "boom" }
    );
  });

  it("calling next() twice throws an error", async () => {
    const a: MiddlewareFn = async (_ctx, next) => {
      await next();
      await next(); // second call
    };

    await assert.rejects(
      () => compose([a])(mockCtx(), async () => {}),
      { message: "next() called multiple times" }
    );
  });
});
