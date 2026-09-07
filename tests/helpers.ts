import { Readable } from "node:stream";
import http from "node:http";

export interface MockRes {
  _body: string;
  _statusCode: number;
  _headers: Record<string, string>;
}

export function createMockReqRes(
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
      if (body) this.push(Buffer.from(body));
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
