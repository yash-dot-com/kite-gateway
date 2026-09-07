import Groq from "groq-sdk";
import { desc, eq, and, gte, lte, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { routes, requestLogs, metrics } from "../db/schema.js";
import type * as schema from "../db/schema.js";
import { log } from "../utils/logger.js";

// ── Tool Definitions ────────────────────────────────────────────

const TOOLS: Groq.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_logs",
      description:
        "Search request logs with optional filters. Returns recent request log entries.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Filter by request path (exact match)" },
          status_code: { type: "number", description: "Filter by HTTP status code" },
          method: { type: "string", description: "Filter by HTTP method (GET, POST, etc.)" },
          from: { type: "string", description: "Start time ISO string" },
          to: { type: "string", description: "End time ISO string" },
          limit: { type: "number", description: "Max results (default 20)" },
          error_only: { type: "boolean", description: "Only return error logs (status >= 400)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_metrics",
      description:
        "Get aggregated metrics for routes (avg response time, error rate, request count, p95).",
      parameters: {
        type: "object",
        properties: {
          route_path: { type: "string", description: "Filter by specific route path" },
          from: { type: "string", description: "Start time ISO string" },
          to: { type: "string", description: "End time ISO string" },
          sort_by: {
            type: "string",
            enum: ["total_requests", "avg_response_time", "error_count"],
            description: "Sort results by this field",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_routes",
      description: "List all configured gateway routes with their targets and settings.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_error_summary",
      description:
        "Get a summary of errors grouped by path and status code.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "Start time ISO string" },
          to: { type: "string", description: "End time ISO string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_health",
      description: "Get current gateway health stats (uptime, memory, counts).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_slow_requests",
      description:
        "Find requests that exceeded a response time threshold.",
      parameters: {
        type: "object",
        properties: {
          threshold_ms: { type: "number", description: "Response time threshold in ms" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
        required: ["threshold_ms"],
      },
    },
  },
];

// ── Tool Executors ──────────────────────────────────────────────

export function createToolExecutors(
  db: BetterSQLite3Database<typeof schema>,
  serverStartTime: number
) {
  return {
    search_logs(args: Record<string, unknown>): unknown {
      const limit = (args.limit as number) || 20;
      const conditions: ReturnType<typeof eq>[] = [];

      if (args.path) conditions.push(eq(requestLogs.path, args.path as string));
      if (args.status_code) conditions.push(eq(requestLogs.statusCode, args.status_code as number));
      if (args.method) conditions.push(eq(requestLogs.method, (args.method as string).toUpperCase()));
      if (args.from) conditions.push(gte(requestLogs.timestamp, args.from as string));
      if (args.to) conditions.push(lte(requestLogs.timestamp, args.to as string));
      if (args.error_only) conditions.push(gte(requestLogs.statusCode, 400));

      let query = db.select().from(requestLogs);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }
      return query.orderBy(desc(requestLogs.id)).limit(limit).all();
    },

    query_metrics(args: Record<string, unknown>): unknown {
      const conditions: ReturnType<typeof eq>[] = [];
      if (args.route_path) conditions.push(eq(metrics.routePath, args.route_path as string));
      if (args.from) conditions.push(gte(metrics.windowStart, args.from as string));
      if (args.to) conditions.push(lte(metrics.windowEnd, args.to as string));

      let query = db.select().from(metrics);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const sortField = args.sort_by as string;
      if (sortField === "total_requests") {
        return query.orderBy(desc(metrics.totalRequests)).limit(50).all();
      } else if (sortField === "avg_response_time") {
        return query.orderBy(desc(metrics.avgResponseTimeMs)).limit(50).all();
      } else if (sortField === "error_count") {
        return query.orderBy(desc(metrics.errorCount)).limit(50).all();
      }
      return query.orderBy(desc(metrics.windowEnd)).limit(50).all();
    },

    get_routes(): unknown {
      const allRoutes = db.select().from(routes).all();
      return allRoutes.map((r) => ({
        ...r,
        methods: JSON.parse(r.methods),
      }));
    },

    get_error_summary(args: Record<string, unknown>): unknown {
      const conditions: string[] = ["status_code >= 400"];
      if (args.from) conditions.push(`timestamp >= '${args.from}'`);
      if (args.to) conditions.push(`timestamp <= '${args.to}'`);

      const whereClause = conditions.join(" AND ");
      const stmt = db.all(sql.raw(`
        SELECT path, status_code, COUNT(*) as count
        FROM request_logs
        WHERE ${whereClause}
        GROUP BY path, status_code
        ORDER BY count DESC
        LIMIT 50
      `));
      return stmt;
    },

    get_health(): unknown {
      const routeCount = db
        .select({ count: sql<number>`count(*)` })
        .from(routes)
        .get();
      const logCount = db
        .select({ count: sql<number>`count(*)` })
        .from(requestLogs)
        .get();
      const mem = process.memoryUsage();

      return {
        status: "healthy",
        uptime: Math.floor((Date.now() - serverStartTime) / 1000),
        memory: {
          rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
        },
        routes: routeCount?.count || 0,
        totalRequests: logCount?.count || 0,
      };
    },

    get_slow_requests(args: Record<string, unknown>): unknown {
      const thresholdMs = args.threshold_ms as number;
      const limit = (args.limit as number) || 20;

      return db
        .select()
        .from(requestLogs)
        .where(gte(requestLogs.responseTimeMs, thresholdMs))
        .orderBy(desc(requestLogs.responseTimeMs))
        .limit(limit)
        .all();
    },
  };
}

// ── Agent Loop ──────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are KITE AI Ops Assistant — an intelligent operations analyst for the KITE API Gateway.

You have access to tools that let you query the gateway's request logs, metrics, routes, and health data stored in a SQLite database.

Your job:
1. Understand the user's question about their API gateway
2. Use the available tools to gather relevant data
3. Analyze the data and provide clear, actionable insights
4. Reference specific numbers, routes, and timestamps in your answers

Guidelines:
- Be concise and data-driven
- If data is insufficient, say so rather than speculating
- Suggest specific actions when appropriate (e.g., "increase rate limit on /api/users from 200 to 500")
- Format responses with markdown for readability`;

export async function runAgentLoop(
  question: string,
  db: BetterSQLite3Database<typeof schema>,
  groqApiKey: string,
  groqModel: string,
  serverStartTime: number
): Promise<string> {
  const groq = new Groq({ apiKey: groqApiKey });
  const executors = createToolExecutors(db, serverStartTime);

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: question },
  ];

  const MAX_ITERATIONS = 10;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    log.debug(`AI Ops agent loop iteration ${i + 1}`, { question });

    const response = await groq.chat.completions.create({
      model: groqModel,
      messages,
      tools: TOOLS,
      tool_choice: "auto",
    });

    const message = response.choices[0]?.message;
    if (!message) {
      return "No response from AI model.";
    }

    // If no tool calls, we have our final answer
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return message.content || "No analysis available.";
    }

    // Add the assistant message (with tool calls) to the conversation
    messages.push(message);

    // Execute each tool call
    for (const toolCall of message.tool_calls) {
      const fnName = toolCall.function.name;
      let args: Record<string, unknown> = {};

      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        args = {};
      }

      log.debug(`AI Ops executing tool: ${fnName}`, args);

      let result: unknown;
      try {
        const executor = executors[fnName as keyof typeof executors];
        if (executor) {
          result = (executor as (args: Record<string, unknown>) => unknown)(args);
        } else {
          result = { error: `Unknown tool: ${fnName}` };
        }
      } catch (err) {
        result = { error: `Tool execution failed: ${String(err)}` };
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  return "Agent reached maximum iterations without a final answer. Please try a more specific question.";
}
