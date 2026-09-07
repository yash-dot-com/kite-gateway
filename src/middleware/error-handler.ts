import type { MiddlewareFn } from "../core/types.js";
import { log } from "../utils/logger.js";

export function createErrorHandler(): MiddlewareFn {
  return async (ctx, next) => {
    try {
      await next();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      const statusCode = (err as { statusCode?: number }).statusCode || 500;
      const message = error.message || "Internal Server Error";

      log.error(`${ctx.method} ${ctx.path} → ${statusCode}`, {
        error: message,
        requestId: ctx.state.requestId,
      });

      if (!ctx.responded) {
        ctx.json(statusCode, {
          error: statusCode >= 500 ? "Internal Server Error" : message,
          message,
          statusCode,
          requestId: ctx.state.requestId,
        });
      }
    }
  };
}
