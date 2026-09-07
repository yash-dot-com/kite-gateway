import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

let _db: BetterSQLite3Database<typeof schema> | null = null;
let _sqlite: Database.Database | null = null;

export function getDb(dbPath: string = "./kite.db"): BetterSQLite3Database<typeof schema> {
  if (!_db) {
    _sqlite = new Database(dbPath);
    _sqlite.pragma("journal_mode = WAL");
    _sqlite.pragma("foreign_keys = ON");
    _db = drizzle(_sqlite, { schema });
  }
  return _db;
}

export function createDb(dbPath: string = ":memory:"): {
  db: BetterSQLite3Database<typeof schema>;
  sqlite: Database.Database;
} {
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

export function closeDb(): void {
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
    _db = null;
  }
}

export function initializeSchema(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      target TEXT NOT NULL,
      methods TEXT NOT NULL,
      auth_required INTEGER NOT NULL DEFAULT 1,
      rate_limit INTEGER NOT NULL DEFAULT 100,
      strip_prefix TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS request_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      response_time_ms INTEGER NOT NULL,
      client_ip TEXT NOT NULL,
      user_id TEXT,
      target_url TEXT,
      user_agent TEXT,
      error_message TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_path TEXT NOT NULL,
      total_requests INTEGER NOT NULL DEFAULT 0,
      success_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      avg_response_time_ms REAL NOT NULL DEFAULT 0,
      p95_response_time_ms REAL NOT NULL DEFAULT 0,
      min_response_time_ms INTEGER NOT NULL DEFAULT 0,
      max_response_time_ms INTEGER NOT NULL DEFAULT 0,
      window_start TEXT NOT NULL,
      window_end TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jwt_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      secret TEXT NOT NULL,
      issuer TEXT NOT NULL DEFAULT 'kite',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp ON request_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_request_logs_path ON request_logs(path);
    CREATE INDEX IF NOT EXISTS idx_request_logs_status ON request_logs(status_code);
    CREATE INDEX IF NOT EXISTS idx_metrics_route_path ON metrics(route_path);
    CREATE INDEX IF NOT EXISTS idx_metrics_window ON metrics(window_start, window_end);
  `);
}
