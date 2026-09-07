import type { MiddlewareFn } from "../core/types.js";
import { verifyJwt } from "../utils/jwt.js";

export function createJwtAuthMiddleware(
  secret: string,
  issuer: string
): MiddlewareFn {
  return async (ctx, next) => {
    // Skip auth for routes that don't require it
    if (ctx.state.route && !ctx.state.route.authRequired) {
      await next();
      return;
    }

    const authHeader = ctx.req.headers.authorization;

    if (!authHeader) {
      ctx.json(401, {
        error: "Unauthorized",
        message: "Missing Authorization header",
      });
      return;
    }

    if (!authHeader.startsWith("Bearer ")) {
      ctx.json(401, {
        error: "Unauthorized",
        message: "Invalid Authorization format. Expected: Bearer <token>",
      });
      return;
    }

    const token = authHeader.slice(7);
    const result = verifyJwt(token, secret, issuer);

    if (!result.valid) {
      ctx.json(401, {
        error: "Unauthorized",
        message: result.error || "Invalid token",
      });
      return;
    }

    // Populate context with auth info
    ctx.state.userId = result.payload!.sub as string | undefined;
    ctx.state.jwtPayload = result.payload as Record<string, unknown>;

    await next();
  };
}
