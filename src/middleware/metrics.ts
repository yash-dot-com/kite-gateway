import type { MiddlewareFn } from "../core/types.js";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { metrics as metricsTable } from "../db/schema.js";
import type * as schema from "../db/schema.js";
import { log } from "../utils/logger.js";

interface RouteAccumulator {
  count: number;
  errors: number;
  successes: number;
  responseTimes: number[];
}

export function createMetricsMiddleware(
  db: BetterSQLite3Database<typeof schema>,
  flushIntervalMs: number = 60_000
): { middleware: MiddlewareFn; flush: () => void; getAccumulators: () => Map<string, RouteAccumulator> } {
  const accumulators = new Map<string, RouteAccumulator>();
  let lastFlush = new Date().toISOString();

  function flush(): void {
    const windowEnd = new Date().toISOString();

    for (const [routePath, acc] of accumulators) {
      if (acc.count === 0) continue;

      const sorted = [...acc.responseTimes].sort((a, b) => a - b);
      const avg =
        sorted.reduce((sum, t) => sum + t, 0) / sorted.length;
      const p95Index = Math.floor(sorted.length * 0.95);
      const p95 = sorted[Math.min(p95Index, sorted.length - 1)];

      try {
        db.insert(metricsTable)
          .values({
            routePath,
            totalRequests: acc.count,
            successCount: acc.successes,
            errorCount: acc.errors,
            avgResponseTimeMs: Math.round(avg * 100) / 100,
            p95ResponseTimeMs: p95,
            minResponseTimeMs: sorted[0],
            maxResponseTimeMs: sorted[sorted.length - 1],
            windowStart: lastFlush,
            windowEnd,
          })
          .run();
      } catch (err) {
        log.error("Failed to flush metrics", { error: String(err) });
      }
    }

    accumulators.clear();
    lastFlush = windowEnd;
  }

  // Periodic flush
  const interval = setInterval(flush, flushIntervalMs);
  if (interval.unref) interval.unref();

  const middleware: MiddlewareFn = async (ctx, next) => {
    const start = process.hrtime.bigint();

    await next();

    const elapsed = Number(process.hrtime.bigint() - start) / 1_000_000;
    const routePath = ctx.state.route?.path || ctx.path;
    const statusCode = ctx.res.statusCode || 200;

    let acc = accumulators.get(routePath);
    if (!acc) {
      acc = { count: 0, errors: 0, successes: 0, responseTimes: [] };
      accumulators.set(routePath, acc);
    }

    acc.count++;
    acc.responseTimes.push(Math.round(elapsed));
    if (statusCode >= 400) {
      acc.errors++;
    } else {
      acc.successes++;
    }
  };

  return { middleware, flush, getAccumulators: () => accumulators };
}
