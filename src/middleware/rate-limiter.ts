import type { MiddlewareFn } from "../core/types.js";

interface RateLimitEntry {
  timestamps: number[];
}

export interface RateLimitConfig {
  windowMs: number;
  defaultMaxRequests: number;
}

export function createRateLimiter(config: RateLimitConfig): MiddlewareFn {
  const store = new Map<string, RateLimitEntry>();

  // Periodic cleanup every 60s
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter(
        (t) => now - t < config.windowMs
      );
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, 60_000);

  // Unref so it doesn't prevent process exit
  if (cleanupInterval.unref) cleanupInterval.unref();

  return async (ctx, next) => {
    const route = ctx.state.route;
    const maxRequests = route?.rateLimit || config.defaultMaxRequests;

    // Key by userId (if authenticated) or IP
    const key = ctx.state.userId || ctx.clientIp;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter(
      (t) => now - t < config.windowMs
    );

    if (entry.timestamps.length >= maxRequests) {
      const oldestInWindow = entry.timestamps[0];
      const retryAfter = Math.ceil(
        (config.windowMs - (now - oldestInWindow)) / 1000
      );

      ctx.setHeader("Retry-After", String(retryAfter));
      ctx.json(429, {
        error: "Too Many Requests",
        message: `Rate limit exceeded. Try again in ${retryAfter}s`,
        retryAfter,
      });
      return;
    }

    entry.timestamps.push(now);
    await next();
  };
}

// Export for testing
export { type RateLimitEntry };
