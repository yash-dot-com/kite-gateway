import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { log } from "../utils/logger.js";
import { getDb, initializeSchema } from "../db/connection.js";
import { seedFromConfig } from "../db/seed.js";
import { Router } from "./router.js";
import { compose } from "./pipeline.js";
import { createContext } from "./context.js";
import { proxyRequest } from "./proxy.js";
import { createErrorHandler } from "../middleware/error-handler.js";
import { createLoggerMiddleware } from "../middleware/logger.js";
import { createCorsMiddleware } from "../middleware/cors.js";
import { createRateLimiter } from "../middleware/rate-limiter.js";
import { createJwtAuthMiddleware } from "../middleware/jwt-auth.js";
import { createMetricsMiddleware } from "../middleware/metrics.js";

import { createAdminHandlers } from "../admin/handlers.js";
import { runAgentLoop } from "../admin/ai-ops.js";

import type { KiteConfig } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function startServers(config: KiteConfig) {
  // 1. Init Database
  const dbPath = process.env.DB_PATH || "./kite.db";
  const db = getDb(dbPath);
  initializeSchema(db.$client as unknown as any); // initializeSchema expects the better-sqlite3 instance
  await seedFromConfig(db, config);
  log.info(`Database initialized at ${dbPath}`);

  // 2. Setup Router
  const router = new Router();
  for (const r of config.routes) {
    router.register({
      id: Math.random(), // In memory representation id
      path: r.path,
      target: r.target,
      methods: r.methods,
      authRequired: r.authRequired,
      rateLimit: r.rateLimit,
      stripPrefix: r.stripPrefix,
    });
  }

  // 3. Setup Middlewares
  const metricsManager = createMetricsMiddleware(db);
  const pipeline = compose([
    createErrorHandler(),
    metricsManager.middleware,
    createLoggerMiddleware(db),
    createCorsMiddleware(config.cors),
    createRateLimiter(config.rateLimiting),
    createJwtAuthMiddleware(config.jwt.secret, config.jwt.issuer),
    async (ctx, next) => {
      // Route matching
      const match = router.lookup(ctx.method, ctx.path);
      if (!match) {
        ctx.json(404, { error: "Not Found", message: `No route configured for ${ctx.method} ${ctx.path}` });
        return;
      }
      ctx.state.route = match.route;
      ctx.params = match.params;

      // Proxy request
      await proxyRequest(ctx, match.route);
    },
  ]);

  // 4. Gateway Server
  const gatewayServer = http.createServer(async (req, res) => {
    const ctx = createContext(req, res);
    await pipeline(ctx, async () => {});
  });

  // 5. Admin Server
  const adminRouter = createAdminHandlers(db, config.jwt.secret, config.jwt.issuer, config.jwt.expiresInSeconds);
  const serverStartTime = Date.now();

  const adminServer = http.createServer(async (req, res) => {
    const ctx = createContext(req, res);
    
    // Add simple CORS to Admin
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (ctx.path.startsWith("/admin")) {
        const handled = await adminRouter.handle(ctx);
        if (!handled) {
          ctx.json(404, { error: "Admin route not found" });
        }
      } else if (ctx.path === "/ai/chat" && ctx.method === "POST") {
        const body = await ctx.body<{ message: string }>();
        if (!body.message) {
          ctx.json(400, { error: "Missing message" });
          return;
        }
        
        const answer = await runAgentLoop(
          body.message,
          db,
          config.groq.apiKey,
          config.groq.model,
          serverStartTime
        );
        ctx.json(200, { answer });
      } else {
        // Serve static files for dashboard from public directory
        let publicPath = path.join(__dirname, "../../public");
        let reqPath = ctx.path === "/" ? "/index.html" : ctx.path;
        let filePath = path.join(publicPath, reqPath);
        
        // Prevent directory traversal
        if (!filePath.startsWith(publicPath)) {
          ctx.text(403, "Forbidden");
          return;
        }

        try {
          const stats = await fs.stat(filePath);
          if (stats.isDirectory()) {
            filePath = path.join(filePath, "index.html");
          }
          const data = await fs.readFile(filePath);
          const ext = path.extname(filePath).toLowerCase();
          
          let contentType = "text/plain";
          if (ext === ".html") contentType = "text/html";
          else if (ext === ".css") contentType = "text/css";
          else if (ext === ".js") contentType = "application/javascript";
          else if (ext === ".json") contentType = "application/json";
          
          res.writeHead(200, { "Content-Type": contentType });
          res.end(data);
          ctx.responded = true;
        } catch (err: any) {
          if (err.code === "ENOENT") {
            // SPA Fallback
            const indexHtml = path.join(publicPath, "index.html");
            try {
              const data = await fs.readFile(indexHtml);
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(data);
              ctx.responded = true;
            } catch {
              ctx.json(404, { error: "File not found" });
            }
          } else {
            throw err;
          }
        }
      }
    } catch (err) {
      log.error("Admin server error", { error: String(err) });
      if (!ctx.responded) {
        ctx.json(500, { error: "Internal Server Error" });
      }
    }
  });

  // Start Servers
  gatewayServer.listen(config.gateway.port, () => {
    log.info(`Proxy Gateway listening on port ${config.gateway.port}`);
  });

  adminServer.listen(config.gateway.adminPort, () => {
    log.info(`Admin Dashboard & API listening on port ${config.gateway.adminPort}`);
  });

  return { gatewayServer, adminServer };
}
