import type { MiddlewareFn } from "../core/types.js";

export interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  maxAge: number;
}

export function createCorsMiddleware(config: CorsConfig): MiddlewareFn {
  return async (ctx, next) => {
    const origin = ctx.req.headers.origin || "";

    // Check if origin is allowed
    const isAllowed =
      config.allowedOrigins.includes("*") ||
      config.allowedOrigins.includes(origin);

    if (isAllowed && origin) {
      ctx.setHeader(
        "Access-Control-Allow-Origin",
        config.allowedOrigins.includes("*") ? "*" : origin
      );
      ctx.setHeader(
        "Access-Control-Allow-Methods",
        config.allowedMethods.join(", ")
      );
      ctx.setHeader(
        "Access-Control-Allow-Headers",
        config.allowedHeaders.join(", ")
      );
      ctx.setHeader("Access-Control-Max-Age", String(config.maxAge));
    }

    // Handle preflight
    if (ctx.method === "OPTIONS") {
      ctx.res.writeHead(204);
      ctx.res.end();
      ctx.responded = true;
      return;
    }

    await next();
  };
}
