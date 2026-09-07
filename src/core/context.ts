import type { IncomingMessage, ServerResponse } from "node:http";
import type { KiteContext, KiteState } from "./types.js";
import { generateId } from "../utils/id.js";

export function createContext(
  req: IncomingMessage,
  res: ServerResponse
): KiteContext {
  const host = req.headers.host || "localhost";
  const protocol = "http";
  const url = new URL(req.url || "/", `${protocol}://${host}`);

  let _responded = false;
  let _bodyCache: unknown | undefined;

  const ctx: KiteContext = {
    req,
    res,
    url,
    path: url.pathname,
    method: (req.method || "GET").toUpperCase(),
    query: url.searchParams,
    params: {},
    state: {
      startTime: process.hrtime.bigint(),
      requestId: generateId(),
    },

    get responded(): boolean {
      return _responded || res.writableEnded;
    },
    set responded(val: boolean) {
      _responded = val;
    },

    json(statusCode: number, data: unknown): void {
      if (_responded || res.writableEnded) return;
      const body = JSON.stringify(data);
      res.writeHead(statusCode, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      });
      res.end(body);
      _responded = true;
    },

    text(statusCode: number, body: string): void {
      if (_responded || res.writableEnded) return;
      res.writeHead(statusCode, {
        "Content-Type": "text/plain",
        "Content-Length": Buffer.byteLength(body),
      });
      res.end(body);
      _responded = true;
    },

    setHeader(key: string, value: string): KiteContext {
      if (!res.headersSent) {
        res.setHeader(key, value);
      }
      return ctx;
    },

    async body<T = unknown>(): Promise<T> {
      if (_bodyCache !== undefined) return _bodyCache as T;

      return new Promise<T>((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf-8");
          if (!raw) {
            _bodyCache = {} as T;
            resolve(_bodyCache as T);
            return;
          }
          try {
            _bodyCache = JSON.parse(raw) as T;
            resolve(_bodyCache as T);
          } catch {
            reject(new Error("Invalid JSON body"));
          }
        });
        req.on("error", reject);
      });
    },

    get clientIp(): string {
      const forwarded = req.headers["x-forwarded-for"];
      if (forwarded) {
        const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
        return first.trim();
      }
      return req.socket?.remoteAddress || "unknown";
    },
  };

  return ctx;
}
