import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import http from "node:http";
import { createContext } from "../../src/core/context.js";

interface MockRes {
  _body: string;
  _statusCode: number;
  _headers: Record<string, string>;
}

function createMockReqRes(
  options: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: string;
    remoteAddress?: string;
  } = {}
): { req: http.IncomingMessage; res: http.ServerResponse & MockRes } {
  const { method = "GET", url = "/", headers = {}, body, remoteAddress = "127.0.0.1" } = options;

  const readable = new Readable({
    read() {
      if (body) {
        this.push(Buffer.from(body));
      }
      this.push(null);
    },
  });

  const req = Object.assign(readable, {
    method,
    url,
    headers: { host: "localhost:3000", ...headers },
    socket: { remoteAddress },
  }) as unknown as http.IncomingMessage;

  let bodyAccum = "";
  let statusCode = 200;
  const hdrs: Record<string, string> = {};
  let ended = false;

  const res = {
    writeHead(code: number, h?: Record<string, string | number>) {
      statusCode = code;
      if (h) {
        for (const [k, v] of Object.entries(h)) {
          hdrs[k.toLowerCase()] = String(v);
        }
      }
      return res;
    },
    setHeader(key: string, value: string) {
      hdrs[key.toLowerCase()] = value;
      return res;
    },
    getHeader(key: string) {
      return hdrs[key.toLowerCase()];
    },
    end(data?: string | Buffer) {
      if (data) bodyAccum += typeof data === "string" ? data : data.toString();
      ended = true;
    },
    get headersSent() { return false; },
    get writableEnded() { return ended; },
    get statusCode() { return statusCode; },
    set statusCode(v: number) { statusCode = v; },
    get _body() { return bodyAccum; },
    get _statusCode() { return statusCode; },
    get _headers() { return hdrs; },
  } as unknown as http.ServerResponse & MockRes;

  return { req, res };
}

describe("KiteContext", () => {
  it("ctx.json(200, data) writes correct Content-Type and body", () => {
    const { req, res } = createMockReqRes();
    const ctx = createContext(req, res);

    ctx.json(200, { message: "hello" });

    assert.equal(res._statusCode, 200);
    assert.equal(res._headers["content-type"], "application/json");
    assert.equal(res._body, '{"message":"hello"}');
  });

  it('ctx.text(200, "ok") writes text/plain response', () => {
    const { req, res } = createMockReqRes();
    const ctx = createContext(req, res);

    ctx.text(200, "ok");

    assert.equal(res._statusCode, 200);
    assert.equal(res._headers["content-type"], "text/plain");
    assert.equal(res._body, "ok");
  });

  it("ctx.body() parses JSON request body from stream", async () => {
    const { req, res } = createMockReqRes({
      method: "POST",
      body: '{"name":"kite"}',
    });
    const ctx = createContext(req, res);

    const data = await ctx.body<{ name: string }>();
    assert.equal(data.name, "kite");
  });

  it("ctx.query parses URL search params correctly", () => {
    const { req, res } = createMockReqRes({
      url: "/search?q=hello&limit=10",
    });
    const ctx = createContext(req, res);

    assert.equal(ctx.query.get("q"), "hello");
    assert.equal(ctx.query.get("limit"), "10");
  });

  it("ctx.clientIp reads x-forwarded-for header", () => {
    const { req, res } = createMockReqRes({
      headers: { "x-forwarded-for": "203.0.113.50, 70.41.3.18" },
    });
    const ctx = createContext(req, res);

    assert.equal(ctx.clientIp, "203.0.113.50");
  });

  it("ctx.clientIp falls back to socket address when no header", () => {
    const { req, res } = createMockReqRes({ remoteAddress: "10.0.0.5" });
    const ctx = createContext(req, res);

    assert.equal(ctx.clientIp, "10.0.0.5");
  });
});
