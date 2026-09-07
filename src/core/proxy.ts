import http from "node:http";
import type { KiteContext, Route } from "./types.js";
import { log } from "../utils/logger.js";

export interface ProxyOptions {
  timeoutMs?: number;
}

export function proxyRequest(
  ctx: KiteContext,
  route: Route,
  options: ProxyOptions = {}
): Promise<void> {
  const { timeoutMs = 30_000 } = options;

  return new Promise<void>((resolve, reject) => {
    const targetUrl = new URL(route.target);
    let forwardPath = ctx.path;

    // Strip prefix if configured
    if (route.stripPrefix && forwardPath.startsWith(route.stripPrefix)) {
      forwardPath = forwardPath.slice(route.stripPrefix.length) || "/";
    }

    // Append query string
    const queryString = ctx.url.search;
    const fullPath = forwardPath + queryString;

    // Build headers — forward originals + add proxy headers
    const headers: Record<string, string | string[] | undefined> = {
      ...ctx.req.headers,
    };
    headers["x-forwarded-for"] = ctx.clientIp;
    headers["x-forwarded-proto"] = "http";
    headers["x-request-id"] = ctx.state.requestId;
    // Remove host header so the target sees its own host
    delete headers["host"];
    headers["host"] = targetUrl.host;

    const proxyReq = http.request(
      {
        hostname: targetUrl.hostname,
        port: targetUrl.port || 80,
        path: fullPath,
        method: ctx.method,
        headers: headers as http.OutgoingHttpHeaders,
      },
      (proxyRes) => {
        // Forward status code and headers
        const statusCode = proxyRes.statusCode || 502;
        const responseHeaders = { ...proxyRes.headers };

        // Remove transfer-encoding when we're passing it through
        // to avoid chunked encoding issues
        if (!ctx.res.headersSent) {
          ctx.res.writeHead(statusCode, responseHeaders);
        }

        // Stream the response back
        proxyRes.pipe(ctx.res, { end: true });
        proxyRes.on("end", () => {
          ctx.responded = true;
          resolve();
        });
        proxyRes.on("error", (err) => {
          log.error("Proxy response error", { error: err.message });
          reject(err);
        });
      }
    );

    // Timeout
    proxyReq.setTimeout(timeoutMs, () => {
      proxyReq.destroy();
      if (!ctx.responded) {
        ctx.json(504, {
          error: "Gateway Timeout",
          message: `Backend did not respond within ${timeoutMs}ms`,
        });
      }
      resolve();
    });

    // Error handling (backend unreachable)
    proxyReq.on("error", (err) => {
      log.error("Proxy connection error", {
        target: route.target,
        error: err.message,
      });
      if (!ctx.responded) {
        ctx.json(502, {
          error: "Bad Gateway",
          message: `Failed to connect to upstream: ${err.message}`,
        });
      }
      resolve(); // Don't reject — we've already sent a response
    });

    // Pipe the incoming request body to the proxy
    ctx.req.pipe(proxyReq, { end: true });
  });
}
