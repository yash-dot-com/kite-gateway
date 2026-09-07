import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { z } from "zod";
import { AdminRouter } from "./router.js";
import { routes, requestLogs, metrics } from "../db/schema.js";
import type * as schema from "../db/schema.js";
import { RouteConfigSchema } from "../core/types.js";
import { signJwt } from "../utils/jwt.js";

const startTime = Date.now();

export function createAdminHandlers(
  db: BetterSQLite3Database<typeof schema>,
  jwtSecret: string,
  jwtIssuer: string,
  jwtExpiresIn: number
): AdminRouter {
  const router = new AdminRouter();

  // ── Routes CRUD ─────────────────────────────────────────────

  router.get("/admin/routes", async (ctx) => {
    const allRoutes = db.select().from(routes).all();
    const parsed = allRoutes.map((r) => ({
      ...r,
      methods: JSON.parse(r.methods),
    }));
    ctx.json(200, parsed);
  });

  router.post("/admin/routes", async (ctx) => {
    const body = await ctx.body();
    const result = RouteConfigSchema.safeParse(body);

    if (!result.success) {
      ctx.json(400, {
        error: "Validation Error",
        details: result.error.flatten(),
      });
      return;
    }

    const newRoute = db
      .insert(routes)
      .values({
        path: result.data.path,
        target: result.data.target,
        methods: JSON.stringify(result.data.methods),
        authRequired: result.data.authRequired,
        rateLimit: result.data.rateLimit,
        stripPrefix: result.data.stripPrefix ?? null,
      })
      .returning()
      .get();

    ctx.json(201, { ...newRoute, methods: JSON.parse(newRoute.methods) });
  });

  router.put("/admin/routes/:id", async (ctx) => {
    const id = parseInt(ctx.params.id, 10);
    const body = await ctx.body();
    const result = RouteConfigSchema.partial().safeParse(body);

    if (!result.success) {
      ctx.json(400, {
        error: "Validation Error",
        details: result.error.flatten(),
      });
      return;
    }

    const existing = db.select().from(routes).where(eq(routes.id, id)).get();
    if (!existing) {
      ctx.json(404, { error: "Route not found" });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (result.data.path) updates.path = result.data.path;
    if (result.data.target) updates.target = result.data.target;
    if (result.data.methods) updates.methods = JSON.stringify(result.data.methods);
    if (result.data.authRequired !== undefined) updates.authRequired = result.data.authRequired;
    if (result.data.rateLimit !== undefined) updates.rateLimit = result.data.rateLimit;
    if (result.data.stripPrefix !== undefined) updates.stripPrefix = result.data.stripPrefix;

    const updated = db
      .update(routes)
      .set(updates)
      .where(eq(routes.id, id))
      .returning()
      .get();

    ctx.json(200, { ...updated, methods: JSON.parse(updated!.methods) });
  });

  router.delete("/admin/routes/:id", async (ctx) => {
    const id = parseInt(ctx.params.id, 10);
    const existing = db.select().from(routes).where(eq(routes.id, id)).get();
    if (!existing) {
      ctx.json(404, { error: "Route not found" });
      return;
    }

    db.delete(routes).where(eq(routes.id, id)).run();
    ctx.json(204, null);
  });

  // ── Logs ────────────────────────────────────────────────────

  router.get("/admin/logs", async (ctx) => {
    const limit = parseInt(ctx.query.get("limit") || "50", 10);
    const path = ctx.query.get("path");
    const status = ctx.query.get("status");
    const from = ctx.query.get("from");
    const to = ctx.query.get("to");

    const conditions: ReturnType<typeof eq>[] = [];
    if (path) conditions.push(eq(requestLogs.path, path));
    if (status) conditions.push(eq(requestLogs.statusCode, parseInt(status, 10)));
    if (from) conditions.push(gte(requestLogs.timestamp, from));
    if (to) conditions.push(lte(requestLogs.timestamp, to));

    let query = db.select().from(requestLogs);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    const rows = query.orderBy(desc(requestLogs.id)).limit(limit).all();

    ctx.json(200, rows);
  });

  // ── Metrics ─────────────────────────────────────────────────

  router.get("/admin/metrics", async (ctx) => {
    const rows = db
      .select()
      .from(metrics)
      .orderBy(desc(metrics.windowEnd))
      .limit(100)
      .all();
    ctx.json(200, rows);
  });

  // ── Health ──────────────────────────────────────────────────

  router.get("/admin/health", async (ctx) => {
    const routeCount = db
      .select({ count: sql<number>`count(*)` })
      .from(routes)
      .get();
    const logCount = db
      .select({ count: sql<number>`count(*)` })
      .from(requestLogs)
      .get();
    const mem = process.memoryUsage();

    ctx.json(200, {
      status: "healthy",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      memory: {
        rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      },
      routes: routeCount?.count || 0,
      totalRequests: logCount?.count || 0,
    });
  });

  // ── JWT Sign ────────────────────────────────────────────────

  router.post("/admin/jwt/sign", async (ctx) => {
    const body = await ctx.body<{ sub?: string; [key: string]: unknown }>();

    const SignSchema = z.object({
      sub: z.string().min(1),
    }).passthrough();

    const result = SignSchema.safeParse(body);
    if (!result.success) {
      ctx.json(400, {
        error: "Validation Error",
        message: "Must provide 'sub' field",
        details: result.error.flatten(),
      });
      return;
    }

    const { sub, ...claims } = result.data;
    const token = signJwt(
      { sub, iss: jwtIssuer, ...claims },
      jwtSecret,
      jwtExpiresIn
    );

    ctx.json(200, { token, expiresIn: jwtExpiresIn });
  });

  // ── Mock Auth (Developer Portal) ────────────────────────────

  const AuthSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
  });

  router.post("/admin/auth/login", async (ctx) => {
    const body = await ctx.body();
    const result = AuthSchema.safeParse(body);
    
    if (!result.success) {
      ctx.json(400, { error: "Username and password required" });
      return;
    }

    // Mock login: Accept any password, issue token for username
    const token = signJwt(
      { sub: result.data.username, iss: jwtIssuer },
      jwtSecret,
      jwtExpiresIn
    );

    ctx.json(200, { token, message: "Logged in successfully" });
  });

  router.post("/admin/auth/signup", async (ctx) => {
    const body = await ctx.body();
    const result = AuthSchema.safeParse(body);
    
    if (!result.success) {
      ctx.json(400, { error: "Username and password required" });
      return;
    }

    // Mock signup: Issue token for new username
    const token = signJwt(
      { sub: result.data.username, iss: jwtIssuer },
      jwtSecret,
      jwtExpiresIn
    );

    ctx.json(201, { token, message: "Account created successfully" });
  });

  return router;
}
