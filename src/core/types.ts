import { z } from "zod";
import type { IncomingMessage, ServerResponse } from "node:http";

// ── Route Config ────────────────────────────────────────────────

export const HttpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "HEAD",
  "OPTIONS",
]);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

export const RouteConfigSchema = z.object({
  path: z.string().min(1),
  target: z.string().url(),
  methods: z.array(HttpMethodSchema).min(1),
  authRequired: z.boolean().default(true),
  rateLimit: z.number().int().positive().default(100),
  stripPrefix: z.string().optional(),
});
export type RouteConfig = z.infer<typeof RouteConfigSchema>;

// ── Gateway Config ──────────────────────────────────────────────

export const KiteConfigSchema = z.object({
  gateway: z.object({
    port: z.number().int().positive().default(3000),
    adminPort: z.number().int().positive().default(3001),
  }),
  jwt: z.object({
    secret: z.string().min(32),
    issuer: z.string().default("kite"),
    expiresInSeconds: z.number().int().positive().default(3600),
  }),
  cors: z.object({
    allowedOrigins: z.array(z.string()).default(["*"]),
    allowedMethods: z.array(z.string()).default(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]),
    allowedHeaders: z.array(z.string()).default(["Content-Type", "Authorization"]),
    maxAge: z.number().int().positive().default(86400),
  }),
  rateLimiting: z.object({
    windowMs: z.number().int().positive().default(60000),
    defaultMaxRequests: z.number().int().positive().default(100),
  }),
  routes: z.array(RouteConfigSchema),
  groq: z.object({
    apiKey: z.string(),
    model: z.string().default("openai/gpt-oss-120b"),
  }),
});
export type KiteConfig = z.infer<typeof KiteConfigSchema>;

// ── Route (DB row enriched) ─────────────────────────────────────

export interface Route {
  id: number;
  path: string;
  target: string;
  methods: string[];
  authRequired: boolean;
  rateLimit: number;
  stripPrefix?: string;
}

// ── Middleware ───────────────────────────────────────────────────

export interface KiteState {
  startTime: bigint;
  requestId: string;
  route?: Route;
  userId?: string;
  jwtPayload?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface KiteContext {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  path: string;
  method: string;
  query: URLSearchParams;
  params: Record<string, string>;
  state: KiteState;
  json(statusCode: number, data: unknown): void;
  text(statusCode: number, body: string): void;
  setHeader(key: string, value: string): KiteContext;
  body<T = unknown>(): Promise<T>;
  clientIp: string;
  responded: boolean;
}

export type MiddlewareFn = (
  ctx: KiteContext,
  next: () => Promise<void>
) => Promise<void>;
