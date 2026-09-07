import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createContext } from "../../src/core/context.js";
import { proxyRequest } from "../../src/core/proxy.js";
import type { Route } from "../../src/core/types.js";

// Helper: start an ephemeral HTTP server and return its URL + close function
function startBackend(
  handler: (req: http.IncomingMessage, res: http.ServerResponse) => void
): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        close: () =>
          new Promise<void>((res) => server.close(() => res())),
      });
    });
  });
}

// Helper: make a real HTTP request and return status + body
function makeRequest(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {}
): Promise<{ statusCode: number; body: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode || 0,
            body: Buffer.concat(chunks).toString(),
            headers: res.headers,
          });
        });
      }
    );
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

describe("Reverse Proxy", () => {
  it("GET request proxied correctly — response body and status match", async () => {
    const backend = await startBackend((req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ user: "alice" }));
    });

    try {
      // Start a proxy server
      const proxyServer = http.createServer(async (req, res) => {
        const ctx = createContext(req, res);
        const route: Route = {
          id: 1, path: "/*", target: backend.url,
          methods: ["GET"], authRequired: false, rateLimit: 100,
        };
        await proxyRequest(ctx, route);
      });

      await new Promise<void>((r) => proxyServer.listen(0, "127.0.0.1", r));
      const proxyAddr = proxyServer.address() as { port: number };

      const result = await makeRequest(`http://127.0.0.1:${proxyAddr.port}/test`);
      assert.equal(result.statusCode, 200);
      assert.deepEqual(JSON.parse(result.body), { user: "alice" });

      await new Promise<void>((r) => proxyServer.close(() => r()));
    } finally {
      await backend.close();
    }
  });

  it("POST request with body — body arrives at backend intact", async () => {
    let receivedBody = "";
    const backend = await startBackend((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        receivedBody = Buffer.concat(chunks).toString();
        res.writeHead(201);
        res.end("created");
      });
    });

    try {
      const proxyServer = http.createServer(async (req, res) => {
        const ctx = createContext(req, res);
        const route: Route = {
          id: 1, path: "/*", target: backend.url,
          methods: ["POST"], authRequired: false, rateLimit: 100,
        };
        await proxyRequest(ctx, route);
      });

      await new Promise<void>((r) => proxyServer.listen(0, "127.0.0.1", r));
      const proxyAddr = proxyServer.address() as { port: number };

      const payload = JSON.stringify({ name: "kite" });
      const result = await makeRequest(`http://127.0.0.1:${proxyAddr.port}/create`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
      });

      assert.equal(result.statusCode, 201);
      assert.equal(receivedBody, payload);

      await new Promise<void>((r) => proxyServer.close(() => r()));
    } finally {
      await backend.close();
    }
  });

  it("Custom headers from client are forwarded to backend", async () => {
    let receivedHeaders: http.IncomingHttpHeaders = {};
    const backend = await startBackend((req, res) => {
      receivedHeaders = req.headers;
      res.writeHead(200);
      res.end("ok");
    });

    try {
      const proxyServer = http.createServer(async (req, res) => {
        const ctx = createContext(req, res);
        const route: Route = {
          id: 1, path: "/*", target: backend.url,
          methods: ["GET"], authRequired: false, rateLimit: 100,
        };
        await proxyRequest(ctx, route);
      });

      await new Promise<void>((r) => proxyServer.listen(0, "127.0.0.1", r));
      const proxyAddr = proxyServer.address() as { port: number };

      await makeRequest(`http://127.0.0.1:${proxyAddr.port}/test`, {
        headers: { "x-custom-header": "hello-kite" },
      });

      assert.equal(receivedHeaders["x-custom-header"], "hello-kite");

      await new Promise<void>((r) => proxyServer.close(() => r()));
    } finally {
      await backend.close();
    }
  });

  it("X-Forwarded-For and X-Request-Id are injected", async () => {
    let receivedHeaders: http.IncomingHttpHeaders = {};
    const backend = await startBackend((req, res) => {
      receivedHeaders = req.headers;
      res.writeHead(200);
      res.end("ok");
    });

    try {
      const proxyServer = http.createServer(async (req, res) => {
        const ctx = createContext(req, res);
        const route: Route = {
          id: 1, path: "/*", target: backend.url,
          methods: ["GET"], authRequired: false, rateLimit: 100,
        };
        await proxyRequest(ctx, route);
      });

      await new Promise<void>((r) => proxyServer.listen(0, "127.0.0.1", r));
      const proxyAddr = proxyServer.address() as { port: number };

      await makeRequest(`http://127.0.0.1:${proxyAddr.port}/test`);

      assert.ok(receivedHeaders["x-forwarded-for"]);
      assert.ok(receivedHeaders["x-request-id"]);

      await new Promise<void>((r) => proxyServer.close(() => r()));
    } finally {
      await backend.close();
    }
  });

  it("path prefix stripping: /api/users/1 → /1 at backend", async () => {
    let receivedPath = "";
    const backend = await startBackend((req, res) => {
      receivedPath = req.url || "";
      res.writeHead(200);
      res.end("ok");
    });

    try {
      const proxyServer = http.createServer(async (req, res) => {
        const ctx = createContext(req, res);
        const route: Route = {
          id: 1, path: "/api/users/*", target: backend.url,
          methods: ["GET"], authRequired: false, rateLimit: 100,
          stripPrefix: "/api/users",
        };
        await proxyRequest(ctx, route);
      });

      await new Promise<void>((r) => proxyServer.listen(0, "127.0.0.1", r));
      const proxyAddr = proxyServer.address() as { port: number };

      await makeRequest(`http://127.0.0.1:${proxyAddr.port}/api/users/42`);

      assert.equal(receivedPath, "/42");

      await new Promise<void>((r) => proxyServer.close(() => r()));
    } finally {
      await backend.close();
    }
  });

  it("backend unreachable → 502 Bad Gateway response", async () => {
    const proxyServer = http.createServer(async (req, res) => {
      const ctx = createContext(req, res);
      const route: Route = {
        id: 1, path: "/*", target: "http://127.0.0.1:59999", // port nothing listens on
        methods: ["GET"], authRequired: false, rateLimit: 100,
      };
      await proxyRequest(ctx, route);
    });

    await new Promise<void>((r) => proxyServer.listen(0, "127.0.0.1", r));
    const proxyAddr = proxyServer.address() as { port: number };

    const result = await makeRequest(`http://127.0.0.1:${proxyAddr.port}/test`);

    assert.equal(result.statusCode, 502);
    const body = JSON.parse(result.body);
    assert.equal(body.error, "Bad Gateway");

    await new Promise<void>((r) => proxyServer.close(() => r()));
  });
});
