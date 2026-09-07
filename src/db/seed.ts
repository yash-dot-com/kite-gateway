import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { routes, jwtKeys } from "./schema.js";
import type * as schema from "./schema.js";
import type { KiteConfig } from "../core/types.js";

export async function seedFromConfig(
  db: BetterSQLite3Database<typeof schema>,
  config: KiteConfig
): Promise<void> {
  // Seed routes
  for (const route of config.routes) {
    const existing = db
      .select()
      .from(routes)
      .where(eq(routes.path, route.path))
      .get();

    if (!existing) {
      db.insert(routes)
        .values({
          path: route.path,
          target: route.target,
          methods: JSON.stringify(route.methods),
          authRequired: route.authRequired,
          rateLimit: route.rateLimit,
          stripPrefix: route.stripPrefix ?? null,
        })
        .run();
    }
  }

  // Seed JWT key from config
  const existingKey = db
    .select()
    .from(jwtKeys)
    .where(eq(jwtKeys.name, "default"))
    .get();

  if (!existingKey) {
    db.insert(jwtKeys)
      .values({
        name: "default",
        secret: config.jwt.secret,
        issuer: config.jwt.issuer,
        active: true,
      })
      .run();
  }
}
