import type { MiddlewareFn } from "./types.js";

export function compose(middlewares: MiddlewareFn[]): MiddlewareFn {
  return async (ctx, next) => {
    let index = -1;

    async function dispatch(i: number): Promise<void> {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;

      const fn = i < middlewares.length ? middlewares[i] : next;
      await fn(ctx, () => dispatch(i + 1));
    }

    await dispatch(0);
  };
}
