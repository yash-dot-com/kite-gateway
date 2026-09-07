const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bold: "\x1b[1m",
} as const;

type LogLevel = "info" | "warn" | "error" | "debug";

const LEVEL_COLORS: Record<LogLevel, string> = {
  info: COLORS.cyan,
  warn: COLORS.yellow,
  error: COLORS.red,
  debug: COLORS.dim,
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  info: "INFO ",
  warn: "WARN ",
  error: "ERROR",
  debug: "DEBUG",
};

function timestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, msg: string, meta?: Record<string, unknown>): string {
  const color = LEVEL_COLORS[level];
  const label = LEVEL_LABELS[level];
  const ts = `${COLORS.dim}${timestamp()}${COLORS.reset}`;
  const lvl = `${color}${COLORS.bold}${label}${COLORS.reset}`;
  const metaStr = meta
    ? ` ${COLORS.dim}${JSON.stringify(meta)}${COLORS.reset}`
    : "";
  return `${ts} ${lvl} ${msg}${metaStr}`;
}

export const log = {
  info(msg: string, meta?: Record<string, unknown>): void {
    console.log(formatMessage("info", msg, meta));
  },
  warn(msg: string, meta?: Record<string, unknown>): void {
    console.warn(formatMessage("warn", msg, meta));
  },
  error(msg: string, meta?: Record<string, unknown>): void {
    console.error(formatMessage("error", msg, meta));
  },
  debug(msg: string, meta?: Record<string, unknown>): void {
    if (process.env.DEBUG) {
      console.log(formatMessage("debug", msg, meta));
    }
  },
};

export function colorStatus(status: number): string {
  if (status >= 500) return `${COLORS.red}${status}${COLORS.reset}`;
  if (status >= 400) return `${COLORS.yellow}${status}${COLORS.reset}`;
  if (status >= 300) return `${COLORS.cyan}${status}${COLORS.reset}`;
  return `${COLORS.green}${status}${COLORS.reset}`;
}

export function colorMethod(method: string): string {
  const colors: Record<string, string> = {
    GET: COLORS.green,
    POST: COLORS.blue,
    PUT: COLORS.yellow,
    DELETE: COLORS.red,
    PATCH: COLORS.magenta,
  };
  const color = colors[method] || COLORS.white;
  return `${color}${COLORS.bold}${method.padEnd(7)}${COLORS.reset}`;
}
