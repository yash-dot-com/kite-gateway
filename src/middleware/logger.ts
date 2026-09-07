import type { MiddlewareFn } from "../core/types.js";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { requestLogs } from "../db/schema.js";
import type * as schema from "../db/schema.js";
import { log, colorStatus, colorMethod } from "../utils/logger.js";

export function createLoggerMiddleware(
  db: BetterSQLite3Database<typeof schema>
): MiddlewareFn {
  return async (ctx, next) => {
    const start = process.hrtime.bigint();

    await next();

    const elapsed = process.hrtime.bigint() - start;
    const responseTimeMs = Number(elapsed / 1_000_000n);
    const statusCode = ctx.res.statusCode || 200;

    // Console log
    log.info(
      `${colorMethod(ctx.method)} ${ctx.path} ${colorStatus(statusCode)} ${responseTimeMs}ms`,
      { requestId: ctx.state.requestId }
    );

    // Persist to DB (fire and forget, don't block response)
    try {
      db.insert(requestLogs)
        .values({
          method: ctx.method,
          path: ctx.path,
          statusCode,
          responseTimeMs,
          clientIp: ctx.clientIp,
          userId: ctx.state.userId || null,
          targetUrl: ctx.state.route?.target || null,
          userAgent: (ctx.req.headers["user-agent"] as string) || null,
          errorMessage: null,
        })
        .run();
    } catch (err) {
      log.error("Failed to persist request log", {
        error: String(err),
      });
    }
  };
}
