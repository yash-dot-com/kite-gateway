import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ── Routes ──────────────────────────────────────────────────────

export const routes = sqliteTable("routes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  path: text("path").notNull(),
  target: text("target").notNull(),
  methods: text("methods").notNull(), // JSON array: '["GET","POST"]'
  authRequired: integer("auth_required", { mode: "boolean" })
    .notNull()
    .default(true),
  rateLimit: integer("rate_limit").notNull().default(100),
  stripPrefix: text("strip_prefix"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ── Request Logs ────────────────────────────────────────────────

export const requestLogs = sqliteTable("request_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  method: text("method").notNull(),
  path: text("path").notNull(),
  statusCode: integer("status_code").notNull(),
  responseTimeMs: integer("response_time_ms").notNull(),
  clientIp: text("client_ip").notNull(),
  userId: text("user_id"),
  targetUrl: text("target_url"),
  userAgent: text("user_agent"),
  errorMessage: text("error_message"),
  timestamp: text("timestamp")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ── Metrics (aggregated) ────────────────────────────────────────

export const metrics = sqliteTable("metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  routePath: text("route_path").notNull(),
  totalRequests: integer("total_requests").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  avgResponseTimeMs: real("avg_response_time_ms").notNull().default(0),
  p95ResponseTimeMs: real("p95_response_time_ms").notNull().default(0),
  minResponseTimeMs: integer("min_response_time_ms").notNull().default(0),
  maxResponseTimeMs: integer("max_response_time_ms").notNull().default(0),
  windowStart: text("window_start").notNull(),
  windowEnd: text("window_end").notNull(),
});

// ── JWT Keys ────────────────────────────────────────────────────

export const jwtKeys = sqliteTable("jwt_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  secret: text("secret").notNull(),
  issuer: text("issuer").notNull().default("kite"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
