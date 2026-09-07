import type { KiteContext } from "../core/types.js";

type AdminHandler = (ctx: KiteContext) => Promise<void>;

interface AdminRoute {
  method: string;
  path: string;
  handler: AdminHandler;
}

export class AdminRouter {
  private routes: AdminRoute[] = [];

  get(path: string, handler: AdminHandler): void {
    this.routes.push({ method: "GET", path, handler });
  }

  post(path: string, handler: AdminHandler): void {
    this.routes.push({ method: "POST", path, handler });
  }

  put(path: string, handler: AdminHandler): void {
    this.routes.push({ method: "PUT", path, handler });
  }

  delete(path: string, handler: AdminHandler): void {
    this.routes.push({ method: "DELETE", path, handler });
  }

  async handle(ctx: KiteContext): Promise<boolean> {
    for (const route of this.routes) {
      const params = this.matchPath(route.method, route.path, ctx.method, ctx.path);
      if (params !== null) {
        ctx.params = params;
        await route.handler(ctx);
        return true;
      }
    }
    return false;
  }

  private matchPath(
    routeMethod: string,
    routePath: string,
    reqMethod: string,
    reqPath: string
  ): Record<string, string> | null {
    if (routeMethod !== reqMethod) return null;

    const routeParts = routePath.split("/").filter(Boolean);
    const reqParts = reqPath.split("/").filter(Boolean);

    if (routeParts.length !== reqParts.length) return null;

    const params: Record<string, string> = {};

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(":")) {
        params[routeParts[i].slice(1)] = reqParts[i];
      } else if (routeParts[i] !== reqParts[i]) {
        return null;
      }
    }

    return params;
  }
}
