import fs from "node:fs/promises";
import path from "node:path";
import { KiteConfigSchema } from "./core/types.js";
import { startServers } from "./core/server.js";
import { log } from "./utils/logger.js";

async function loadConfig() {
  const configPath = path.resolve(process.cwd(), "kite.config.json");
  try {
    let data = await fs.readFile(configPath, "utf-8");
    // Expand environment variables like ${GROQ_API_KEY}
    data = data.replace(/\$\{(.+?)\}/g, (_, varName) => process.env[varName] || "");
    const parsed = JSON.parse(data);
    const result = KiteConfigSchema.safeParse(parsed);
    if (!result.success) {
      log.error("Invalid configuration", { details: result.error.flatten() });
      process.exit(1);
    }
    return result.data;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      log.error(`Config file not found at ${configPath}. Please create kite.config.json`);
    } else {
      log.error(`Failed to load config: ${err.message}`);
    }
    process.exit(1);
  }
}

async function main() {
  try {
    log.info("Starting KITE API Gateway...");
    const config = await loadConfig();
    await startServers(config);
  } catch (err) {
    log.error("Fatal error during startup", { error: String(err) });
    process.exit(1);
  }
}

main();
