# KITE API Gateway — Source-Grounded Software Engineering & Modelling Laboratory (SEML) Audit Report

**Document Title:** Comprehensive Technical Audit and Source-Grounded Architectural Extraction for the KITE API Gateway  
**Repository Path:** `/Users/yash/Desktop/kite`  
**Target Output Artifact:** `KITE_REPORT_EXTRACTION.md`  
**Audit Date:** October 2026  
**Auditor:** Senior Software Architect  
**Classification:** Academic SEML Mini Project Comprehensive Technical Extraction  

---

## Executive Summary & Audit Methodology

This document contains an exhaustive, source-grounded technical audit of the **KITE API Gateway** codebase. Every architectural assertion, structural breakdown, requirement, metric, schema definition, and behavioral analysis in this report is derived directly from the physical source files present in the repository.

### Audit Compliance Matrix
- **Grounding Principle:** Every substantive technical claim is anchored by exact repository paths, exported symbols, classes, interfaces, and function signatures.
- **Truth In Engineering:** Unimplemented, planned, partially implemented, and missing components are explicitly distinguished from verified production code.
- **Zero Hallucination:** No classes, dependencies, benchmarks, or configuration files are invented.
- **Security & Privacy:** No actual API keys, credentials, tokens, or JWT signing secrets are exposed.

---

# SECTION 1: PROJECT IDENTITY

### 1.1 Project Overview
* **Project Name:** KITE (Kite API Gateway & Reverse Proxy)
* **Tagline / Description:** A lightweight, high-performance API Gateway and Reverse Proxy built from scratch using Node.js and TypeScript, functioning as the single ingress entry point for microservice architectures.
* **Problem Addressed:** In distributed microservice topologies, client applications face complexity when directly communicating with disparate backend services. Direct communication introduces tight coupling, scattered cross-cutting concerns (authentication, rate limiting, logging, CORS handling), increased attack surfaces, and a lack of centralized operational observability.
* **Core Purpose:** KITE provides a centralized ingress edge proxy that manages dynamic request routing, enforces token-based security, throttles traffic, logs telemetry into an embedded database, hosts an operational dashboard, and exposes an AI-driven operations assistant for real-time diagnostics.

### 1.2 Technology Stack & Runtime Configuration

| Dimension | Specification / Selection | Source Evidence |
| :--- | :--- | :--- |
| **Language** | TypeScript 5.7.0 (Target: `ES2022`, Module: `NodeNext`) | [`tsconfig.json`](file:///Users/yash/Desktop/kite/tsconfig.json#L2-L20) |
| **Runtime Engine** | Node.js v20.6+ / v22+ (Native ESM via `"type": "module"`) | [`package.json`](file:///Users/yash/Desktop/kite/package.json#L5), [`README.md`](file:///Users/yash/Desktop/kite/README.md#L38-L51) |
| **Package Manager** | npm (with `package-lock.json` lockfile version 3) | [`package.json`](file:///Users/yash/Desktop/kite/package.json), [`package-lock.json`](file:///Users/yash/Desktop/kite/package-lock.json) |
| **HTTP Engine** | Native Node.js `node:http` (Zero third-party web frameworks) | [`src/core/server.ts`](file:///Users/yash/Desktop/kite/src/core/server.ts#L1), [`src/core/proxy.ts`](file:///Users/yash/Desktop/kite/src/core/proxy.ts#L1) |
| **Proxy Transport** | Native `http.request` stream piping | [`src/core/proxy.ts`](file:///Users/yash/Desktop/kite/src/core/proxy.ts#L40-L101) |
| **Database Engine** | SQLite3 via `better-sqlite3` v11.0.0 (WAL mode enabled) | [`package.json`](file:///Users/yash/Desktop/kite/package.json#L17), [`src/db/connection.ts`](file:///Users/yash/Desktop/kite/src/db/connection.ts#L1-L26) |
| **ORM / Query Builder** | Drizzle ORM v0.39.0 & Drizzle Kit v0.30.0 | [`package.json`](file:///Users/yash/Desktop/kite/package.json#L18-L25), [`drizzle.config.ts`](file:///Users/yash/Desktop/kite/drizzle.config.ts#L1-L10) |
| **Schema Validation** | Zod v3.24.0 | [`package.json`](file:///Users/yash/Desktop/kite/package.json#L20), [`src/core/types.ts`](file:///Users/yash/Desktop/kite/src/core/types.ts#L1-L55) |
| **AI Integration** | Groq SDK v1.5.0 (`groq-sdk`) | [`package.json`](file:///Users/yash/Desktop/kite/package.json#L19), [`src/admin/ai-ops.ts`](file:///Users/yash/Desktop/kite/src/admin/ai-ops.ts#L1-L236) |
| **Cryptography** | Native `node:crypto` (HMAC-SHA256, `timingSafeEqual`, `randomUUID`) | [`src/utils/jwt.ts`](file:///Users/yash/Desktop/kite/src/utils/jwt.ts#L1-L87), [`src/utils/id.ts`](file:///Users/yash/Desktop/kite/src/utils/id.ts#L1-L5) |
| **Testing Engine** | Native `node:test` + `node:assert/strict` | [`package.json`](file:///Users/yash/Desktop/kite/package.json#L11), [`tests/helpers.ts`](file:///Users/yash/Desktop/kite/tests/helpers.ts) |
| **Frontend UI** | Vanilla HTML5, Modern CSS3 (Glassmorphism), Vanilla ES6 JS | [`public/index.html`](file:///Users/yash/Desktop/kite/public/index.html), [`public/css/style.css`](file:///Users/yash/Desktop/kite/public/css/style.css) |

### 1.3 Startup and Lifecycle Commands
All operational commands are declared in [`package.json`](file:///Users/yash/Desktop/kite/package.json#L7-L15):
* **Development Server:** `npm run dev`  
  *Executes:* `tsx watch --env-file=.env src/index.ts`  
  *Function:* Launches TypeScript file watcher using `tsx`, automatically loading `.env` variables into `process.env`.
* **TypeScript Compilation:** `npm run build`  
  *Executes:* `tsc`  
  *Function:* Emits compiled JavaScript files and source maps into the `./dist` directory.
* **Production Start:** `npm run start`  
  *Executes:* `node dist/index.js`  
  *Function:* Boots precompiled JavaScript runtime without live-reloading.
* **Automated Test Suite:** `npm run test`  
  *Executes:* `node --import tsx --test "tests/**/*.test.ts"`  
  *Function:* Native Node.js test runner executing all test suites across the repository.
* **Database Schema Push:** `npm run db:push`  
  *Executes:* `drizzle-kit push`  
  *Function:* Synchronizes TypeScript database schema definitions with the SQLite database file.
* **Database Migration Generation:** `npm run db:generate`  
  *Executes:* `drizzle-kit generate`  
  *Function:* Compiles Drizzle SQL migration files into `./drizzle`.
* **Mock Microservice Backend:** `npm run mock`  
  *Executes:* `tsx examples/mock-backend.ts`  
  *Function:* Spins up three upstream HTTP services listening on ports `4001`, `4002`, and `4003`.

### 1.4 Complete Repository File Tree
```
/Users/yash/Desktop/kite
├── .env                          # Local environment variables (e.g., GROQ_API_KEY)
├── .gitignore                    # Exclusions: node_modules, dist, kite.db, .env
├── drizzle.config.ts             # Drizzle Kit CLI configuration (SQLite dialect, schema pointer)
├── kite.config.json              # Primary static gateway declaration (ports, CORS, routes)
├── kite.db                       # Primary SQLite database file
├── kite.db-shm                   # SQLite WAL shared-memory index
├── kite.db-wal                   # SQLite Write-Ahead Log
├── package.json                  # Project manifest, dependencies, and NPM scripts
├── package-lock.json             # Pinned dependency tree
├── README.md                     # Project documentation and architectural overview
├── tsconfig.json                 # TypeScript compiler configuration (ES2022, NodeNext)
├── examples/
│   └── mock-backend.ts           # Ephemeral mock microservices on ports 4001, 4002, 4003
├── public/                       # Static web client assets (served on port 3001)
│   ├── index.html                # Main Admin Dashboard (Charts, Routes, Logs, AI Ops)
│   ├── client.html               # End-User Interactive API Simulation Client
│   ├── auth.html                 # Developer Identity & Mock JWT Generation Portal
│   ├── css/
│   │   ├── auth.css              # Authentication Portal styling
│   │   ├── client.css            # Client Demo UI styling
│   │   └── style.css             # Unified Glassmorphic design system and variables
│   └── js/
│       ├── api.js                # Frontend API abstraction client (`KiteAPI`)
│       ├── app.js                # Admin Dashboard view controller and event bindings
│       ├── auth.js               # Auth Portal token generation and clipboard controller
│       ├── client.js             # Client Demo request dispatcher and syntax highlighter
│       └── ui.js                 # UI utility helpers (toasts, view transitions, Markdown)
├── src/                          # Gateway Backend Core (TypeScript)
│   ├── index.ts                  # Application bootstrap entry point & config loader
│   ├── admin/
│   │   ├── ai-ops.ts             # Groq SDK AI Ops assistant, schema tools & agent loop
│   │   ├── handlers.ts           # REST API route handlers for administrative operations
│   │   └── router.ts             # Exact-match & parameterized router for Admin API
│   ├── core/
│   │   ├── context.ts            # KiteContext factory (`createContext`)
│   │   ├── pipeline.ts           # Koa-style onion middleware composition (`compose`)
│   │   ├── proxy.ts              # Upstream HTTP streaming proxy (`proxyRequest`)
│   │   ├── router.ts             # Radix/Trie router supporting wildcards and params
│   │   ├── server.ts             # Dual HTTP server initializer (Gateway: 3000, Admin: 3001)
│   │   └── types.ts              # Zod schemas, TypeScript types, and interfaces
│   ├── db/
│   │   ├── connection.ts         # SQLite instance pool, WAL pragma, schema initialization
│   │   ├── schema.ts             # Drizzle ORM table definitions (routes, logs, metrics, keys)
│   │   └── seed.ts               # Idempotent database seeder from `kite.config.json`
│   └── utils/
│       ├── id.ts                 # UUIDv4 generator
│       ├── jwt.ts                # Zero-dependency HMAC-SHA256 JWT sign & verify utility
│       └── logger.ts             # ANSI color-coded structured console logger
└── tests/                        # Automated Test Suite (75 Tests)
    ├── helpers.ts                # Mock IncomingMessage & ServerResponse test doubles
    ├── admin/
    │   ├── ai-ops.test.ts        # Unit tests for AI Ops tool executors
    │   └── handlers.test.ts      # Integration tests for Admin REST endpoints
    ├── core/
    │   ├── context.test.ts       # Context helper tests (body parsing, query, IP)
    │   ├── pipeline.test.ts      # Middleware onion flow & error propagation tests
    │   ├── proxy.test.ts         # Upstream proxying, header injection & 502/504 tests
    │   └── router.test.ts        # Trie routing tests (exact, params, wildcards, priority)
    ├── db/
    │   └── schema.test.ts        # SQLite in-memory table creation and seeding tests
    ├── middleware/
    │   ├── cors.test.ts          # Preflight OPTIONS and CORS header injection tests
    │   ├── jwt-auth.test.ts      # Token validation, missing header, and expiration tests
    │   ├── logger.test.ts        # Database logging insertion and latency measurement tests
    │   └── rate-limiter.test.ts  # Sliding window rate limiter & IP/User keying tests
    └── utils/
        └── jwt.test.ts           # Pure cryptographic HMAC-SHA256 unit tests
```

---

# SECTION 2: VERIFIED FEATURES & ARCHITECTURAL RECONCILIATION

### 2.1 Verified Feature Inventory

Each feature below has been directly verified through source analysis.

| Feature Category | Implementation Status | Relevant Files | Grounded Mechanism & Architecture |
| :--- | :--- | :--- | :--- |
| **Reverse Proxy** | **IMPLEMENTED** | [`src/core/proxy.ts`](file:///Users/yash/Desktop/kite/src/core/proxy.ts) | Streams inbound client HTTP body to upstream target using native `http.request`. Piped response streaming with 30s timeout and error traps. |
| **Trie Routing** | **IMPLEMENTED** | [`src/core/router.ts`](file:///Users/yash/Desktop/kite/src/core/router.ts) | Custom prefix Trie supporting exact match, parameterized segments (`:id`), and terminal wildcard globbing (`*`). $O(K)$ lookup where $K$ is segment count. |
| **Middleware Pipeline**| **IMPLEMENTED** | [`src/core/pipeline.ts`](file:///Users/yash/Desktop/kite/src/core/pipeline.ts) | Koa-style asynchronous onion composition (`compose`). Supports downstream/upstream execution phases with double-call trap protection. |
| **JWT Authentication** | **IMPLEMENTED** | [`src/middleware/jwt-auth.ts`](file:///Users/yash/Desktop/kite/src/middleware/jwt-auth.ts), [`src/utils/jwt.ts`](file:///Users/yash/Desktop/kite/src/utils/jwt.ts) | Zero-external-dependency HMAC-SHA256 signature generation and timing-safe verification (`crypto.timingSafeEqual`). Validates expiration and issuer. |
| **API Key Auth** | **PARTIALLY IMPLEMENTED** | [`src/db/schema.ts`](file:///Users/yash/Desktop/kite/src/db/schema.ts#L56), [`src/db/seed.ts`](file:///Users/yash/Desktop/kite/src/db/seed.ts#L33) | `jwt_keys` table stores named keys in SQLite and seeds a default key. However, gateway request pipeline lacks an API key header extraction middleware. |
| **CORS Management** | **IMPLEMENTED** | [`src/middleware/cors.ts`](file:///Users/yash/Desktop/kite/src/middleware/cors.ts) | Injects `Access-Control-Allow-*` headers matching origin allowlists. Automatically terminates `OPTIONS` preflight requests with HTTP 204. |
| **Rate Limiting** | **IMPLEMENTED** | [`src/middleware/rate-limiter.ts`](file:///Users/yash/Desktop/kite/src/middleware/rate-limiter.ts) | Sliding-window in-memory timestamp array keyed by `userId` (if authenticated) or `clientIp`. Emits HTTP 429 with `Retry-After` header. |
| **Traffic Management** | **NOT FOUND** | N/A | No round-robin upstream balancing, circuit breakers, or automatic request retries exist in the codebase. Proxy maps 1:1 path to single target URL. |
| **Database & Persistence**| **IMPLEMENTED** | [`src/db/connection.ts`](file:///Users/yash/Desktop/kite/src/db/connection.ts), [`src/db/schema.ts`](file:///Users/yash/Desktop/kite/src/db/schema.ts) | SQLite3 backed by `better-sqlite3` and `drizzle-orm`. WAL mode enabled. Houses gateway configuration, persistent request logs, and aggregated metrics. |
| **Admin Dashboard UI** | **IMPLEMENTED** | [`public/index.html`](file:///Users/yash/Desktop/kite/public/index.html), [`public/js/app.js`](file:///Users/yash/Desktop/kite/public/js/app.js) | Dark-themed, responsive glassmorphic single-page interface managing routes, visualizing live metrics, inspecting log tables, and housing AI chat. |
| **Admin REST API** | **IMPLEMENTED** | [`src/admin/handlers.ts`](file:///Users/yash/Desktop/kite/src/admin/handlers.ts), [`src/admin/router.ts`](file:///Users/yash/Desktop/kite/src/admin/router.ts) | CRUD endpoints on port 3001 for `/admin/routes`, `/admin/logs`, `/admin/metrics`, `/admin/health`, and token signing. |
| **AI Ops Assistant** | **IMPLEMENTED** | [`src/admin/ai-ops.ts`](file:///Users/yash/Desktop/kite/src/admin/ai-ops.ts) | Autonomous multi-turn agent loop powered by Groq SDK with dynamic tool/function calling (`search_logs`, `query_metrics`, `get_routes`, `get_health`, etc.). |
| **Caching Engine** | **NOT FOUND** | N/A | No proxy-level HTTP response caching (RFC 7234, in-memory cache, or Redis cache) is implemented. |
| **Observability & Metrics**| **IMPLEMENTED** | [`src/middleware/metrics.ts`](file:///Users/yash/Desktop/kite/src/middleware/metrics.ts), [`src/middleware/logger.ts`](file:///Users/yash/Desktop/kite/src/middleware/logger.ts) | Request duration tracking via `process.hrtime.bigint()`. Asynchronous SQLite log insertion and periodic 60-second in-memory metrics window aggregation. |
| **CI / CD Pipelines** | **NOT FOUND** | N/A | No `.github/workflows`, `.gitlab-ci.yml`, or automated CI configurations are present in the repository root. |
| **Containerization** | **NOT FOUND** | N/A | No `Dockerfile`, `.dockerignore`, or `docker-compose.yml` files exist in the repository. |

---

### 2.2 Explicit Architectural Reconciliation

> [!IMPORTANT]
> **Resolution of Architectural Discrepancy:**  
> An architectural audit was conducted to reconcile any references to an enterprise stack (**Fastify / PostgreSQL / Redis / undici**) against the actual repository implementation (**Node.js native `http` / SQLite / Better-SQLite3 / In-Memory State**).

The following comparison matrix documents the empirical reality of the codebase:

```
               SPECULATED / CONCEIVED ARCHITECTURE                     ACTUALLY IMPLEMENTED ARCHITECTURE
       ┌─────────────────────────────────────────────────┐     ┌─────────────────────────────────────────────────┐
       │ - Framework: Fastify                            │     │ - Framework: Native node:http (No Framework)    │
       │ - Database:  PostgreSQL (pg / @vercel/postgres) │ ==> │ - Database:  SQLite (better-sqlite3 + Drizzle) │
       │ - Caching:   Distributed Redis (ioredis)        │     │ - Rate Limit: In-Memory Map (Sliding Window)    │
       │ - Transport: Undici HTTP/1.1 client             │     │ - Transport: Native http.request streaming      │
       │ - Container: Docker / Multi-stage Compose       │     │ - Process:   Bare-metal tsx/Node.js host        │
       └─────────────────────────────────────────────────┘     └─────────────────────────────────────────────────┘
```

1. **Web Framework:**
   * *Speculated:* Fastify web framework.
   * *Actual:* **Zero-framework native `node:http`**. The gateway server ([`src/core/server.ts:74`](file:///Users/yash/Desktop/kite/src/core/server.ts#L74)) and admin server ([`src/core/server.ts:83`](file:///Users/yash/Desktop/kite/src/core/server.ts#L83)) are constructed directly via `http.createServer()`. Neither `fastify` nor `express` exists in [`package.json`](file:///Users/yash/Desktop/kite/package.json).
2. **Database Engine:**
   * *Speculated:* PostgreSQL.
   * *Actual:* **SQLite3 (`better-sqlite3` v11.0.0)** configured via Drizzle ORM ([`src/db/connection.ts:8-16`](file:///Users/yash/Desktop/kite/src/db/connection.ts#L8-L16)). The database is stored locally in `kite.db` with Write-Ahead Logging (`PRAGMA journal_mode = WAL`). The only references to `postgres` in the repository reside as dormant peer dependencies inside `package-lock.json`.
3. **Rate Limiting & Caching Engine:**
   * *Speculated:* Distributed Redis cache (`ioredis`).
   * *Actual:* **Process-local in-memory `Map<string, RateLimitEntry>`** ([`src/middleware/rate-limiter.ts:13`](file:///Users/yash/Desktop/kite/src/middleware/rate-limiter.ts#L13)). Rate limiting state is non-distributed, tied to a single Node.js process, and periodically cleaned via `setInterval`. No Redis connection or client is imported.
4. **Proxy Client Engine:**
   * *Speculated:* `undici` high-performance HTTP client.
   * *Actual:* **Native `node:http.request`** ([`src/core/proxy.ts:40`](file:///Users/yash/Desktop/kite/src/core/proxy.ts#L40)). Request bodies and upstream response bodies are streamed using standard Node.js stream `.pipe()` semantics. The string `undici-types` in `package-lock.json` is pulled solely as a transitive sub-dependency of `@types/node`.
5. **Architectural Evaluation:**
   The implemented architecture represents a conscious design for an embedded, dependency-free academic demonstration. It eliminates external service dependencies (no Redis servers or PostgreSQL daemons are required to run KITE), allowing the entire system to boot instantaneously on any machine with Node.js.

---

# SECTION 3: SOFTWARE REQUIREMENTS SPECIFICATION

### 3.1 Functional Requirements (FR)

#### Implemented Functional Requirements
* **FR-1: Dynamic Request Forwarding:** The system must accept HTTP requests on port 3000, match the request path against registered route prefixes, strip path prefixes if configured (`stripPrefix`), and pipe the payload to the configured upstream target URL.
* **FR-2: Trie-Based Route Matching:** The gateway must support $O(K)$ path resolution with strict priority: exact match > parameterized path (`:param`) > terminal wildcard (`/*`).
* **FR-3: Header Forwarding & Enrichment:** The gateway must forward client request headers while stripping client `host` headers, overriding with upstream `host`, and injecting `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Request-Id`.
* **FR-4: Upstream Timeout Handling:** The gateway must terminate stalled upstream requests after a configurable duration (default 30,000ms) and return an HTTP 504 Gateway Timeout JSON payload.
* **FR-5: Bad Gateway Fault Handling:** If the upstream target is unreachable or closes the socket unexpectedly, the gateway must capture the network error and return an HTTP 502 Bad Gateway response without crashing the gateway.
* **FR-6: Stateless JWT Authentication:** The gateway must enforce HMAC-SHA256 JWT verification on routes with `authRequired: true`. Requests lacking a `Bearer <token>` header or carrying invalid/expired tokens must be rejected with HTTP 401 Unauthorized.
* **FR-7: Sliding Window Rate Limiting:** The gateway must track request timestamps per client IP (or authenticated `userId`), rejecting requests that exceed the route-specific or global rate threshold within a rolling 60,000ms window with HTTP 429 Too Many Requests and a `Retry-After` header.
* **FR-8: Dynamic CORS Negotiation:** The gateway must intercept HTTP `OPTIONS` requests, return HTTP 204 with configured `Access-Control-Allow-*` headers, and append appropriate CORS headers to actual cross-origin requests.
* **FR-9: Telemetry & Asynchronous Logging:** The gateway must calculate request latency using high-resolution monotonic clocks (`process.hrtime.bigint()`) and persist execution logs asynchronously to the `request_logs` SQLite table.
* **FR-10: Periodic Metric Window Aggregation:** The system must maintain an in-memory accumulator of route execution metrics and flush aggregated stats (total, success, error, average, p95, min, max response time) to SQLite every 60 seconds.
* **FR-11: Route Management Administration API:** The system must expose REST endpoints on port 3001 permitting administrators to create (`POST /admin/routes`), list (`GET /admin/routes`), update (`PUT /admin/routes/:id`), and delete (`DELETE /admin/routes/:id`) routes.
* **FR-12: Health & System Diagnostics:** The system must expose `GET /admin/health` providing gateway uptime, process memory consumption (RSS, heapUsed, heapTotal), route count, and aggregate request count.
* **FR-13: Interactive Diagnostic AI Assistant:** The system must expose `POST /ai/chat` utilizing Groq SDK function-calling to analyze SQLite database logs, metrics, and health status in response to user queries.
* **FR-14: Developer Token Portal:** The system must provide mock authentication endpoints (`/admin/auth/login` and `/admin/auth/signup`) issuing signed JWT tokens for client simulation.

#### Planned / Unimplemented Requirements (Identified Gaps)
* **FR-PL-1: Runtime Route Cache Invalidation:** Dynamic route mutations executed in the Admin API do not currently re-index the Gateway's in-memory Trie router without a server restart.
* **FR-PL-2: Distributed Token Store:** Centralization of rate limiting counters via a distributed backend (e.g., Redis).
* **FR-PL-3: Circuit Breaker Pattern:** Automatic temporary trip of routing to backends that return consecutive 5xx errors.
* **FR-PL-4: Administrative Security:** Authentication and role-based access control (RBAC) on the Admin Control Plane (port 3001).

---

### 3.2 User-Facing Use Cases

```
                                  KITE API GATEWAY SYSTEM
  ┌────────────────────────────────────────────────────────────────────────────────────────┐
  │                                                                                        │
  │   ┌───────────────────────────┐                ┌───────────────────────────────┐       │
  │   │  UC-1: Execute API Call   │                │  UC-5: Manage Dynamic Routes  │       │
  │   │  (Public / Protected)     │                │  (Create, Update, Delete)     │       │
  │   └─────────────▲─────────────┘                └───────────────▲───────────────┘       │
  │                 │                                              │                       │
  │   ┌─────────────┴─────────────┐                ┌───────────────┴───────────────┐       │
  │   │  UC-2: Authenticate &     │                │  UC-6: Inspect Live Logs &    │       │
  │   │  Obtain Mock JWT Token    │                │  Filter System Telemetry      │       │
  │   └─────────────▲─────────────┘                └───────────────▲───────────────┘       │
  │                 │                                              │                       │
  │   ┌─────────────┴─────────────┐                ┌───────────────┴───────────────┐       │
  │   │  UC-3: Simulate Client    │                │  UC-7: Query AI Ops Assistant │       │
  │   │  Traffic via Demo Portal  │                │  for System Diagnostics       │       │
  │   └─────────────▲─────────────┘                └───────────────▲───────────────┘       │
  │                 │                                              │                       │
  │   ┌─────────────┴─────────────┐                ┌───────────────┴───────────────┐       │
  │   │  UC-4: Negotiate CORS     │                │  UC-8: Monitor Gateway Health │       │
  │   │  Preflight Request        │                │  and System Resources         │       │
  │   └─────────────▲─────────────┘                └───────────────▲───────────────┘       │
  │                 │                                              │                       │
  └─────────────────┼──────────────────────────────────────────────┼───────────────────────┘
                    │                                              │
             «Actor: Human»                                 «Actor: Human»
             API Client /                                   Gateway Admin /
             End User                                       Operator
```

* **UC-1: Execute API Request**
  * *Primary Actor:* API Client / Mobile Application
  * *Precondition:* Gateway running on port 3000; upstream target online.
  * *Main Flow:* Client issues HTTP request to gateway; gateway validates CORS, rate limit, and JWT (if required); strips prefix; streams request to upstream; streams response back to client.
* **UC-2: Authenticate and Generate JWT**
  * *Primary Actor:* Developer / Client Demo User
  * *Precondition:* Admin server active on port 3001.
  * *Main Flow:* User accesses `/auth.html`, enters username/password, receives a signed HMAC-SHA256 JWT token with 1-hour expiration.
* **UC-3: Simulate Traffic via Client Demo**
  * *Primary Actor:* QA Engineer / Lab Evaluator
  * *Precondition:* Mock backends online (`npm run mock`).
  * *Main Flow:* User visits `/client.html`, selects an endpoint (`/api/users/123`, `/api/products/456`), toggles token attachment, views formatted JSON responses and latency metrics.
* **UC-4: Diagnose Outages via AI Ops**
  * *Primary Actor:* System Administrator
  * *Precondition:* `GROQ_API_KEY` defined in `.env`.
  * *Main Flow:* Admin opens `/index.html#ai-view`, types natural language prompt ("Why are requests to /api/users failing?"), AI model executes function-calling on SQLite logs, synthesizes diagnostic analysis.

---

### 3.3 Non-Functional Requirements (NFR)

1. **Performance & Latency:**
   * In-memory route lookup must execute in sub-millisecond time ($O(K)$ where $K \le 10$ path segments).
   * Middleware execution overhead must remain $< 5\text{ms}$ per request under normal operational conditions.
   * Full streaming proxy architecture must stream data chunks immediately without buffering entire payloads in RAM.
2. **Reliability & Availability:**
   * Unhandled upstream failures must never terminate the Node.js event loop.
   * Database writes (logging and metric flushing) must occur asynchronously without blocking the client HTTP response stream.
3. **Security Standards:**
   * Cryptographic verification of JWT tokens must use constant-time comparison (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.
   * Path traversal protections must safeguard static asset serving in the administrative server (`path.join` checks).
4. **Maintainability & Modularity:**
   * Zero third-party web frameworks; core components must adhere to the single-responsibility principle.
   * Strict TypeScript typing across all core interfaces.

---

### 3.4 System Constraints & Configuration Schema

#### System Constraints
* **Platform:** Node.js runtime environment (v20.6.0+ required for native `--env-file` support).
* **Persistence:** Single-host embedded SQLite database (not designed for multi-node write clustering without Litestream or dqlite).
* **Network Isolation:** Administrative API and Gateway Proxy bind to separate ports (`3000` and `3001`).

#### Configuration Schema ([`kite.config.json`](file:///Users/yash/Desktop/kite/kite.config.json))
Configuration is strictly validated at boot time using Zod ([`src/core/types.ts:29-54`](file:///Users/yash/Desktop/kite/src/core/types.ts#L29-L54)):

| Path | Type | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `gateway.port` | `number` | `3000` | Ingress reverse proxy listening port |
| `gateway.adminPort`| `number` | `3001` | Administrative dashboard and API listening port |
| `jwt.secret` | `string` (min 32) | *[Configured]* | HMAC-SHA256 symmetric signing and verification key |
| `jwt.issuer` | `string` | `"kite"` | Expected JWT issuer (`iss` claim) |
| `jwt.expiresInSeconds` | `number` | `3600` | Token lifetime (1 hour) |
| `cors.allowedOrigins` | `string[]` | `["*"]` | Whitelisted cross-origin domains |
| `cors.allowedMethods` | `string[]` | `["GET","POST",...]` | Permitted HTTP verbs for CORS preflight |
| `cors.allowedHeaders` | `string[]` | `["Content-Type",...]`| Permitted request headers |
| `cors.maxAge` | `number` | `86400` | Preflight cache validity in seconds |
| `rateLimiting.windowMs`| `number` | `60000` | Rolling sliding window duration (60s) |
| `rateLimiting.defaultMaxRequests` | `number` | `100` | Default quota per window per client |
| `routes` | `RouteConfig[]`| `[]` | Array of routing definitions |
| `routes[].path` | `string` | *Mandatory* | Path matching pattern (`/api/users/*`) |
| `routes[].target` | `string` (URL) | *Mandatory* | Upstream target (`http://localhost:4001`) |
| `routes[].methods` | `HttpMethod[]` | *Mandatory* | Permitted HTTP verbs |
| `routes[].authRequired`| `boolean`| `true` | Enforces JWT presence and validity |
| `routes[].rateLimit` | `number` | `100` | Route-specific rate limit quota |
| `routes[].stripPrefix` | `string` | `undefined` | Prefix to strip prior to forwarding |
| `groq.apiKey` | `string` | `${GROQ_API_KEY}` | API key for Groq Cloud LLM |
| `groq.model` | `string` | `"qwen/qwen3.8-27b"` | LLM model identifier used for AI Ops |

---

# SECTION 4: SYSTEM ARCHITECTURE & RUNTIME DYNAMICS

### 4.1 Subsystem Decomposition

The KITE system is partitioned into eight modular subsystems:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       KITE RUNTIME PROCESS                                             │
│                                                                                                        │
│   ┌──────────────────────────────────────────────────────┐  ┌──────────────────────────────────────┐   │
│   │            GATEWAY SERVER (Port 3000)                │  │       ADMIN SERVER (Port 3001)       │   │
│   │                                                      │  │                                      │   │
│   │  ┌────────────────┐       ┌───────────────────────┐  │  │  ┌────────────────────────────────┐  │   │
│   │  │  Context Init  │ ───>  │  Middleware Pipeline  │  │  │  │ Static File Engine (public/)   │  │   │
│   │  └────────────────┘       └───────────┬───────────┘  │  │  └────────────────────────────────┘  │   │
│   │                                       │              │  │  ┌────────────────────────────────┐  │   │
│   │                           ┌───────────▼───────────┐  │  │  │ Admin REST API Handlers        │  │   │
│   │                           │    Trie-Based Router   │  │  │  └────────────────────────────────┘  │   │
│   │                           └───────────┬───────────┘  │  │  ┌────────────────────────────────┐  │   │
│   │                                       │              │  │  │ AI Ops Agent Loop (Groq SDK)   │  │   │
│   │                           ┌───────────▼───────────┐  │  │  └────────────────────────────────┘  │   │
│   │                           │ Streaming HTTP Proxy  │  │  │                                      │   │
│   │                           └───────────┬───────────┘  │  └──────────────────┬───────────────────┘   │
│   └───────────────────────────────────────┼──────────────┘                     │                       │
│                                           │                                    │                       │
│                                           ▼                                    ▼                       │
│                         ┌────────────────────────────────────────────────────────────┐                 │
│                         │        DATABASE ENGINE (SQLite + Drizzle ORM)              │                 │
│                         │  Tables: routes, request_logs, metrics, jwt_keys           │                 │
│                         └────────────────────────────────────────────────────────────┘                 │
└───────────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                    │ Upstream HTTP Streaming
                                                    ▼
                               ┌──────────────────────────────────────────┐
                               │   EXTERNAL / MOCK UPSTREAM SERVICES      │
                               │   - Users Service    (Port 4001)         │
                               │   - Products Service (Port 4002)         │
                               │   - Orders Service   (Port 4003)         │
                               └──────────────────────────────────────────┘
```

1. **Context Engine ([`src/core/context.ts`](file:///Users/yash/Desktop/kite/src/core/context.ts)):** Wraps raw `node:http` request/response pairs into a unified `KiteContext` holding request parameters, URL query parsing, unique request UUIDs, client IP detection, and response helper methods (`json`, `text`, `setHeader`).
2. **Middleware Pipeline ([`src/core/pipeline.ts`](file:///Users/yash/Desktop/kite/src/core/pipeline.ts)):** Executes an onion-model composition function `compose(middlewares)` managing pre-processing and post-processing across request lifecycles.
3. **Routing Engine ([`src/core/router.ts`](file:///Users/yash/Desktop/kite/src/core/router.ts)):** Implements an in-memory Trie data structure for fast URL matching with parameter extraction and wildcard matching.
4. **Proxy Core ([`src/core/proxy.ts`](file:///Users/yash/Desktop/kite/src/core/proxy.ts)):** Forwards HTTP requests to upstream microservices, injects proxy headers, handles socket timeouts, and streams responses back.
5. **Database Subsystem ([`src/db/connection.ts`](file:///Users/yash/Desktop/kite/src/db/connection.ts)):** SQLite instance manager operating with Write-Ahead Logging (`WAL`), holding relational representations of routes, access logs, metrics, and JWT keys.
6. **Admin Control Plane ([`src/admin/handlers.ts`](file:///Users/yash/Desktop/kite/src/admin/handlers.ts)):** Provides HTTP endpoints to manage routes, query telemetry, check health, and generate mock credentials.
7. **Static Asset Engine ([`src/core/server.ts:118-162`](file:///Users/yash/Desktop/kite/src/core/server.ts#L118-L162)):** Serves Vanilla HTML/CSS/JS frontend files directly from the `./public` directory with MIME-type mapping and path traversal guards.
8. **AI Ops Subsystem ([`src/admin/ai-ops.ts`](file:///Users/yash/Desktop/kite/src/admin/ai-ops.ts)):** Autonomous diagnostic assistant executing LLM tool calling against SQLite system telemetry.

---

### 4.2 Middleware Execution Order

The request pipeline is assembled in [`src/core/server.ts:51-71`](file:///Users/yash/Desktop/kite/src/core/server.ts#L51-L71) using `compose()`:

$$\text{Request} \longrightarrow \mathbf{M}_1 \longrightarrow \mathbf{M}_2 \longrightarrow \mathbf{M}_3 \longrightarrow \mathbf{M}_4 \longrightarrow \mathbf{M}_5 \longrightarrow \mathbf{M}_6 \longrightarrow \mathbf{M}_7 \longrightarrow \text{Upstream}$$

```
==================================================================================================
STAGE 1: INCOMING REQUEST (DOWNSTREAM EXECUTION)
==================================================================================================
1. ErrorHandler      (src/middleware/error-handler.ts)
   - Wraps downstream execution in try/catch block. Catches uncaught exceptions.
   - Emits structured JSON error response if res.headersSent is false.
2. MetricsMiddleware (src/middleware/metrics.ts)
   - Records high-resolution start time: process.hrtime.bigint().
   - Registers interval-based metric flusher (every 60s).
3. LoggerMiddleware  (src/middleware/logger.ts)
   - Captures inbound request arrival time.
4. CorsMiddleware    (src/middleware/cors.ts)
   - Checks origin against cors.allowedOrigins.
   - Intercepts OPTIONS verb -> returns HTTP 204 immediately, halts chain.
5. RateLimiter       (src/middleware/rate-limiter.ts)
   - Identifies client via ctx.state.userId || ctx.clientIp.
   - Verifies request count within sliding window. If exceeded -> HTTP 429.
6. JwtAuthMiddleware (src/middleware/jwt-auth.ts)
   - Checks if route requires auth.
   - Validates Bearer token format, verifies HMAC signature, populates ctx.state.userId.
7. Route Dispatcher  (src/core/server.ts inline handler)
   - Looks up ctx.method and ctx.path in Router Trie.
   - If not matched -> returns HTTP 404 Not Found.
   - If matched -> executes proxyRequest(ctx, match.route).

==================================================================================================
STAGE 2: UPSTREAM FORWARDING & RESPONSE (UPSTREAM EXECUTION)
==================================================================================================
- proxyRequest: Pipes ctx.req -> upstream http.request; pipes upstream proxyRes -> ctx.res.
- Await unrolls upstream:
  * JwtAuth completes.
  * RateLimiter records timestamp.
  * CorsMiddleware completes.
  * LoggerMiddleware calculates duration and asynchronously executes db.insert(requestLogs).
  * MetricsMiddleware updates route accumulator (count, latency, errors).
  * ErrorHandler finalizes.
==================================================================================================
```

> [!WARNING]
> **Architectural Observation on Middleware Order:**  
> In [`src/core/server.ts:51-71`](file:///Users/yash/Desktop/kite/src/core/server.ts#L51-L71), the route matching logic resides in the **last** handler (`M_7`). Consequently, during the forward traversal through `RateLimiter` (`M_5`) and `JwtAuth` (`M_6`), `ctx.state.route` is initially `undefined`.  
> *Effect:* In production, `RateLimiter` falls back to `config.rateLimiting.defaultMaxRequests` rather than the route-specific limit, and `JwtAuth` evaluates `ctx.state.route?.authRequired` as falsy unless a header check intervenes or route matching is executed prior to auth. In the test suite, test helpers explicitly attach `ctx.state.route` prior to running middleware in isolation.

---

### 4.3 Detailed Sequential Request Flow

```
Client              KiteContext          Pipeline             TrieRouter           ProxyRequest         Upstream
  │                      │                   │                    │                     │                  │
  │─── HTTP Request ────>│                   │                    │                     │                  │
  │    (Port 3000)       │                   │                    │                     │                  │
  │                      │── createContext ─>│                    │                     │                  │
  │                      │                   │── ErrorHandler ───>│                     │                  │
  │                      │                   │── Metrics (start) ─│                     │                  │
  │                      │                   │── Logger (start) ──│                     │                  │
  │                      │                   │── CORS (headers) ──│                     │                  │
  │                      │                   │── RateLimit Check ─│                     │                  │
  │                      │                   │── JWT Verify ─────>│                     │                  │
  │                      │                   │                    │                     │                  │
  │                      │                   │── router.lookup ──>│                     │                  │
  │                      │                   │<── RouteMatch ─────│                     │                  │
  │                      │                   │                                          │                  │
  │                      │                   │── Execute proxyRequest(ctx, route) ─────>│                  │
  │                      │                   │                                          │── http.request ─>│
  │                      │                   │                                          │   (Piped Body)   │
  │                      │                   │                                          │                  │
  │                      │                   │                                          │<── Upstream Res ─│
  │                      │<──────────────────┴──────────────────────────────────────────│   (Piped Stream) │
  │<── HTTP Response ────│                                                              │                  │
  │                      │                                                                                 │
  │                      │── (Unroll Middleware) ─────────────────────────────────────────────────────────>│
  │                      │   - Logger inserts into SQLite request_logs                                     │
  │                      │   - Metrics updates route accumulators                                          │
```

---

# SECTION 5: ACTORS, OBJECTS, AND UML SPECIFICATIONS

### 5.1 System Actors
1. **API Client / End User (Human / External Client):** Interacts with gateway ingress on port 3000 to consume backend microservices.
2. **Gateway Administrator / Developer (Human):** Manages routing configurations, monitors real-time telemetry, and queries the AI Ops Assistant via port 3001.
3. **Upstream Microservice (External System Actor):** Downstream REST HTTP services (e.g., Users Service on 4001, Products on 4002, Orders on 4003).
4. **Groq Cloud LLM API (External System Actor):** External inference endpoint processing conversational queries and returning structured tool-call directives.

---

### 5.2 UML Class Diagram (Source-Grounded Model)

```mermaid
classDiagram
    class KiteServer {
        +startServers(config: KiteConfig)
    }

    class Router {
        -root: TrieNode
        +register(route: Route): void
        +lookup(method: string, path: string): RouteMatch?
        -search(node: TrieNode, segments: string[], index: number, params: Map): TrieNode?
        -normalizePath(path: string): string
    }

    class TrieNode {
        +children: Map~string, TrieNode~
        +paramChild: ParamNode?
        +wildcardChild: TrieNode?
        +handlers: Map~string, Route~
    }

    class KiteContext {
        +req: IncomingMessage
        +res: ServerResponse
        +url: URL
        +path: string
        +method: string
        +query: URLSearchParams
        +params: Record~string, string~
        +state: KiteState
        +clientIp: string
        +responded: boolean
        +json(code: number, data: any): void
        +text(code: number, body: string): void
        +setHeader(k: string, v: string): KiteContext
        +body~T~(): Promise~T~
    }

    class ProxyCore {
        +proxyRequest(ctx: KiteContext, route: Route, options: ProxyOptions): Promise~void~
    }

    class AdminRouter {
        -routes: AdminRoute[]
        +get(path: string, handler: Function): void
        +post(path: string, handler: Function): void
        +put(path: string, handler: Function): void
        +delete(path: string, handler: Function): void
        +handle(ctx: KiteContext): Promise~boolean~
        -matchPath(rMethod: string, rPath: string, reqMethod: string, reqPath: string): Map?
    }

    class AIOpsAgent {
        +runAgentLoop(q: string, db: Database, apiKey: string, model: string, start: number): Promise~string~
        +createToolExecutors(db: Database, start: number): Object
    }

    class JwtUtils {
        +signJwt(payload: Object, secret: string, expiresIn: number): string
        +verifyJwt(token: string, secret: string, expectedIssuer: string): JwtVerifyResult
    }

    Router *-- TrieNode : contains
    KiteServer ..> Router : instantiates
    KiteServer ..> KiteContext : creates per request
    KiteServer ..> ProxyCore : invokes
    KiteServer ..> AdminRouter : configures
    AdminRouter ..> AIOpsAgent : dispatches chat to
    KiteServer ..> JwtUtils : verifies tokens with
```

---

### 5.3 UML Sequence Diagram: Reverse Proxy Request Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Client as API Client
    participant Svr as Gateway Server (3000)
    participant Ctx as KiteContext
    participant Pipe as Middleware Pipeline
    participant Rtr as Trie Router
    participant Prx as Proxy Engine
    participant DB as SQLite Database
    actor Upstream as Upstream Service (4001)

    Client->>Svr: HTTP GET /api/users/42 (Bearer Token)
    Svr->>Ctx: createContext(req, res)
    Svr->>Pipe: dispatch(0) (Execute composition)
    
    Pipe->>Pipe: CorsMiddleware (evaluate headers)
    Pipe->>Pipe: RateLimiter (validate window quota)
    Pipe->>Pipe: JwtAuthMiddleware (verify HMAC signature)
    
    Pipe->>Rtr: lookup("GET", "/api/users/42")
    Rtr-->>Pipe: RouteMatch { route, params: { id: "42" } }
    
    Pipe->>Prx: proxyRequest(ctx, route)
    Prx->>Prx: Strip prefix ("/api/users" -> "/42")
    Prx->>Prx: Inject X-Forwarded-For, X-Request-Id
    
    Prx->>Upstream: http.request(GET /42, headers)
    Upstream-->>Prx: Upstream Response (200 OK + JSON stream)
    
    Prx->>Client: Stream Response Body (res.pipe)
    Prx-->>Pipe: Resolve Promise
    
    Pipe->>DB: LoggerMiddleware: insert into request_logs
    Pipe->>Pipe: MetricsMiddleware: aggregate route latency
```

---

### 5.4 UML State Chart Diagram: Rate Limiter Token Bucket / Sliding Window

```mermaid
stateDiagram-v2
    [*] --> Uninitialized: Client Arrives

    Uninitialized --> ActiveWindow: First Request (Create Timestamp Array)
    
    state ActiveWindow {
        [*] --> CheckLimit
        CheckLimit --> WithinQuota: timestamps.length < maxRequests
        WithinQuota --> AppendTimestamp: Add Date.now()
        AppendTimestamp --> PassThrough: Call next()
        
        CheckLimit --> QuotaExceeded: timestamps.length >= maxRequests
        QuotaExceeded --> CalculateRetry: Compute (windowMs - (now - oldest))
        CalculateRetry --> Reject429: Emit HTTP 429 + Retry-After
    }

    ActiveWindow --> PrunedWindow: Periodic 60s Interval (Filter t < now - windowMs)
    PrunedWindow --> ActiveWindow: Retain Active Timestamps
    PrunedWindow --> [*]: Timestamps Empty (Delete Key from Map)
```

---

### 5.5 UML Activity Diagram: Ingress Request Processing Flow

```mermaid
flowchart TD
    Start([Inbound Client Request]) --> CreateCtx[Create KiteContext & Assign UUID]
    CreateCtx --> ErrorWrap[Enter ErrorHandler Wrapper]
    ErrorWrap --> StartMetrics[Record hrtime Start]
    StartMetrics --> CheckCORS{HTTP Method == OPTIONS?}
    
    CheckCORS -- Yes --> Send204[Return HTTP 204 Preflight] --> End([Terminated])
    CheckCORS -- No --> ApplyCORS[Inject Access-Control-Allow Headers]
    
    ApplyCORS --> CheckRateLimit{Request Count < Limit?}
    CheckRateLimit -- No --> Send429[Return HTTP 429 Too Many Requests] --> End
    CheckRateLimit -- Yes --> RecordTimestamp[Store Window Timestamp]
    
    RecordTimestamp --> CheckAuthRequired{Route Auth Required?}
    CheckAuthRequired -- Yes --> ValidateJWT{Valid Bearer JWT Token?}
    ValidateJWT -- No --> Send401[Return HTTP 401 Unauthorized] --> End
    ValidateJWT -- Yes --> SetUser[Populate ctx.state.userId] --> LookupRoute
    CheckAuthRequired -- No --> LookupRoute
    
    LookupRoute[Trie Router Lookup] --> RouteExists{Matching Route Found?}
    RouteExists -- No --> Send404[Return HTTP 404 Route Not Found] --> End
    RouteExists -- Yes --> StripPref[Apply Prefix Stripping]
    
    StripPref --> InjectHeaders[Inject X-Forwarded-* & Request-ID]
    InjectHeaders --> StreamToUpstream[Stream Request to Upstream Backend]
    
    StreamToUpstream --> UpstreamResponsive{Upstream Responded?}
    UpstreamResponsive -- Timeout > 30s --> Send504[Return HTTP 504 Gateway Timeout]
    UpstreamResponsive -- Connection Refused --> Send502[Return HTTP 502 Bad Gateway]
    UpstreamResponsive -- Success --> StreamBack[Pipe Response to Client]
    
    Send504 --> LogDB[Insert Record to request_logs]
    Send502 --> LogDB
    StreamBack --> LogDB
    LogDB --> UpdateMetrics[Accumulate In-Memory Metrics]
    UpdateMetrics --> End
```

---

# SECTION 6: DATABASE DESIGN & SCHEMA ARCHITECTURE

The persistent storage tier is implemented with SQLite via `better-sqlite3` and modeled using Drizzle ORM ([`src/db/schema.ts`](file:///Users/yash/Desktop/kite/src/db/schema.ts)).

### 6.1 Entity-Relationship & Relational Schema

```
┌─────────────────────────────────────────┐         ┌─────────────────────────────────────────┐
│                 routes                  │         │              request_logs               │
├─────────────────────────────────────────┤         ├─────────────────────────────────────────┤
│ PK  id            INTEGER AUTOINCREMENT │         │ PK  id               INTEGER AUTOINC    │
│     path          TEXT NOT NULL         │         │     method           TEXT NOT NULL      │
│     target        TEXT NOT NULL         │         │     path             TEXT NOT NULL      │
│     methods       TEXT NOT NULL (JSON)  │         │     status_code      INTEGER NOT NULL   │
│     auth_required INTEGER DEFAULT 1     │         │     response_time_ms INTEGER NOT NULL   │
│     rate_limit    INTEGER DEFAULT 100   │         │     client_ip        TEXT NOT NULL      │
│     strip_prefix  TEXT                  │         │     user_id          TEXT               │
│     created_at    TEXT DEFAULT now()    │         │     target_url       TEXT               │
└─────────────────────────────────────────┘         │     user_agent       TEXT               │
                                                    │     error_message    TEXT               │
┌─────────────────────────────────────────┐         │     timestamp        TEXT DEFAULT now() │
│                 metrics                 │         └─────────────────────────────────────────┘
├─────────────────────────────────────────┤
│ PK  id                   INTEGER AUTOINC│         ┌─────────────────────────────────────────┐
│     route_path           TEXT NOT NULL  │         │                jwt_keys                 │
│     total_requests       INTEGER DFLT 0 │         ├─────────────────────────────────────────┤
│     success_count        INTEGER DFLT 0 │         │ PK  id         INTEGER AUTOINCREMENT    │
│     error_count          INTEGER DFLT 0 │         │     name       TEXT NOT NULL            │
│     avg_response_time_ms REAL DEFAULT 0 │         │     secret     TEXT NOT NULL            │
│     p95_response_time_ms REAL DEFAULT 0 │         │     issuer     TEXT DEFAULT 'kite'      │
│     min_response_time_ms INTEGER DFLT 0 │         │     active     INTEGER DEFAULT 1        │
│     max_response_time_ms INTEGER DFLT 0 │         │     created_at TEXT DEFAULT now()       │
│     window_start         TEXT NOT NULL  │         └─────────────────────────────────────────┘
│     window_end           TEXT NOT NULL  │
└─────────────────────────────────────────┘
```

### 6.2 Data Dictionary & Table Definitions

#### Table 1: `routes`
Stores persistent route forwarding configurations.
* `id` (INTEGER, Primary Key, Auto Increment)
* `path` (TEXT, NOT NULL) — Path pattern (e.g., `/api/users/*`).
* `target` (TEXT, NOT NULL) — Upstream target host (e.g., `http://localhost:4001`).
* `methods` (TEXT, NOT NULL) — JSON-encoded string array (e.g., `'["GET","POST"]'`).
* `auth_required` (INTEGER as boolean, NOT NULL, Default: `1`).
* `rate_limit` (INTEGER, NOT NULL, Default: `100`).
* `strip_prefix` (TEXT, Nullable) — Path prefix to strip before forwarding.
* `created_at` (TEXT, NOT NULL, Default: ISO Timestamp).

#### Table 2: `request_logs`
Chronological record of every proxy and gateway transaction.
* `id` (INTEGER, Primary Key, Auto Increment)
* `method` (TEXT, NOT NULL) — HTTP verb.
* `path` (TEXT, NOT NULL) — Request path.
* `status_code` (INTEGER, NOT NULL) — Response HTTP code.
* `response_time_ms` (INTEGER, NOT NULL) — Total round-trip processing latency in ms.
* `client_ip` (TEXT, NOT NULL) — IP address extracted from `X-Forwarded-For` or socket.
* `user_id` (TEXT, Nullable) — Extracted JWT subject (`sub`) claim.
* `target_url` (TEXT, Nullable) — Destination backend URL.
* `user_agent` (TEXT, Nullable) — Client user-agent string.
* `error_message` (TEXT, Nullable) — Internal error text if failure occurred.
* `timestamp` (TEXT, NOT NULL, Default: ISO Timestamp).

#### Table 3: `metrics`
Periodic aggregated historical metrics windows generated by `createMetricsMiddleware`.
* `id` (INTEGER, Primary Key, Auto Increment)
* `route_path` (TEXT, NOT NULL) — Associated route pattern.
* `total_requests` (INTEGER, Default: `0`).
* `success_count` (INTEGER, Default: `0`) — Status codes $< 400$.
* `error_count` (INTEGER, Default: `0`) — Status codes $\ge 400$.
* `avg_response_time_ms` (REAL, Default: `0.0`).
* `p95_response_time_ms` (REAL, Default: `0.0`) — 95th percentile response latency.
* `min_response_time_ms` (INTEGER, Default: `0`).
* `max_response_time_ms` (INTEGER, Default: `0`).
* `window_start` (TEXT, NOT NULL) — ISO Timestamp start of metric window.
* `window_end` (TEXT, NOT NULL) — ISO Timestamp end of metric window.

#### Table 4: `jwt_keys`
Key store for cryptographic verification secrets.
* `id` (INTEGER, Primary Key, Auto Increment)
* `name` (TEXT, NOT NULL) — Identifier (e.g., `"default"`).
* `secret` (TEXT, NOT NULL) — Symmetric HMAC key.
* `issuer` (TEXT, NOT NULL, Default: `'kite'`).
* `active` (INTEGER as boolean, Default: `1`).
* `created_at` (TEXT, NOT NULL, Default: ISO Timestamp).

### 6.3 Database Indexes & Storage Optimizations
Declared in [`src/db/connection.ts:87-91`](file:///Users/yash/Desktop/kite/src/db/connection.ts#L87-L91):
1. `idx_request_logs_timestamp` ON `request_logs(timestamp)` — Optimizes time-window log filtering.
2. `idx_request_logs_path` ON `request_logs(path)` — Optimizes route-specific log queries.
3. `idx_request_logs_status` ON `request_logs(status_code)` — Speeds up error reporting ($status \ge 400$).
4. `idx_metrics_route_path` ON `metrics(route_path)` — Accelerates dashboard route metric aggregations.
5. `idx_metrics_window` ON `metrics(window_start, window_end)` — Speeds up historical telemetry window queries.

---

# SECTION 7: SECURITY AND RELIABILITY ARCHITECTURE

### 7.1 Cryptographic JWT Verification
* **Algorithm:** HMAC-SHA256 (`HS256`).
* **Implementation:** Zero third-party dependencies, built with `node:crypto` ([`src/utils/jwt.ts`](file:///Users/yash/Desktop/kite/src/utils/jwt.ts)).
* **Security Guard:** Signature validation uses `crypto.timingSafeEqual` ([`src/utils/jwt.ts:85`](file:///Users/yash/Desktop/kite/src/utils/jwt.ts#L85)) to prevent byte-by-byte timing attacks.
* **Payload Verification:** Verifies expiration (`exp`), issuance (`iat`), and expected issuer identity (`iss`).

### 7.2 Input Validation & Boundary Defense
* **Zod Schemas:** Configuration files, route creations, and administrative payloads undergo schema validation:
  * `RouteConfigSchema` validates targets as valid URLs, HTTP methods against a strict whitelist, and minimum rate limit thresholds.
  * Static file server in [`src/core/server.ts:124`](file:///Users/yash/Desktop/kite/src/core/server.ts#L124) enforces boundary checks: `!filePath.startsWith(publicPath)` returning HTTP 403 Forbidden on directory traversal attacks (`../`).

### 7.3 Fault Handling & Network Reliability
* **Upstream Timeout Policy:** The proxy client configures `proxyReq.setTimeout(timeoutMs, ...)` defaulting to 30,000ms. If the timer fires before the socket completes, the client socket is destroyed and an HTTP 504 Gateway Timeout is returned.
* **Bad Gateway Trapping:** Network errors (such as `ECONNREFUSED` or `EHOSTUNREACH`) are caught via `proxyReq.on("error")`, returning an HTTP 502 Bad Gateway response while maintaining process stability.
* **Double Call Protection:** The pipeline composition function ([`src/core/pipeline.ts:8-10`](file:///Users/yash/Desktop/kite/src/core/pipeline.ts#L8-L10)) tracks an execution index and throws an explicit error if a middleware calls `next()` more than once.

### 7.4 Verified Security Limitations & Vulnerabilities
1. **Unprotected Admin API:** The administrative control plane on port 3001 does not mandate authentication headers or API keys. Anyone with network visibility to port 3001 can add, modify, or delete routes and inspect system logs.
2. **Mock Authentication Credential Validation:** The developer login endpoint in [`src/admin/handlers.ts:206-223`](file:///Users/yash/Desktop/kite/src/admin/handlers.ts#L206-L223) accepts *any* non-empty username and password, issuing a signed token without verifying password hashes against a database.
3. **Single Process State Vulnerability:** Rate limiting counters reside in memory; restarting the gateway process resets all client quota tracking.

---

# SECTION 8: AUTOMATED TESTING & VERIFICATION REPORT

### 8.1 Test Configuration & Execution

Testing was executed against the repository using the native Node.js test runner:
```bash
node --import tsx --test "tests/**/*.test.ts"
```

* **Test Framework:** Native `node:test` + `node:assert/strict`.
* **Execution Status:** **PASS** (Zero test failures across the entire suite).
* **Execution Duration:** 337.24 ms.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TEST VERIFICATION SUMMARY                       │
├─────────────────────────┬──────────────────────────────────────────────┤
│ Total Test Suites       │ 14 Suites (12 top-level + 2 nested)          │
│ Total Executed Tests    │ 75 Tests                                     │
│ Passed Tests            │ 75 Passed                                    │
│ Failed Tests            │ 0 Failed                                     │
│ Skipped / Todo Tests    │ 0 Skipped / 0 Todo                           │
│ Pass Rate               │ 100.0%                                       │
│ Overall Wall Duration   │ 337.24 ms                                    │
└─────────────────────────┴──────────────────────────────────────────────┘
```

---

### 8.2 Detailed Test Suite Breakdown

| Test Suite / File | Test Cases | Status | Scope / Method Tested |
| :--- | :---: | :---: | :--- |
| **Trie Router** ([`router.test.ts`](file:///Users/yash/Desktop/kite/tests/core/router.test.ts)) | 10 | **PASS** | Exact matches, `:id` extraction, multi-param paths, wildcard globbing, method filtering, route priority (exact > param), trailing slash normalization. |
| **Admin API Handlers** ([`handlers.test.ts`](file:///Users/yash/Desktop/kite/tests/admin/handlers.test.ts)) | 8 | **PASS** | Route CRUD (`GET`, `POST` valid/invalid, `PUT`, `DELETE`), log retrieval & filtering (`status=500`), and `/admin/health` uptime/memory reporting. |
| **JWT Utilities** ([`jwt.test.ts`](file:///Users/yash/Desktop/kite/tests/utils/jwt.test.ts)) | 8 | **PASS** | `signJwt` 3-part formatting, expiration timestamps, `verifyJwt` valid tokens, tampered payload rejection, wrong secret, expired tokens, and wrong issuer. |
| **Middleware Pipeline** ([`pipeline.test.ts`](file:///Users/yash/Desktop/kite/tests/core/pipeline.test.ts)) | 7 | **PASS** | Onion execution ordering ($A \to B \to C \to B \to A$), downstream `ctx.state` modifications, upstream return transformations, error bubble-up, and double `next()` rejection. |
| **Reverse Proxy** ([`proxy.test.ts`](file:///Users/yash/Desktop/kite/tests/core/proxy.test.ts)) | 6 | **PASS** | Real HTTP ephemeral proxying: GET status/body passthrough, POST streaming integrity, header forwarding, `X-Forwarded-*` injection, prefix stripping, and 502 on `ECONNREFUSED`. |
| **Rate Limiter Middleware** ([`rate-limiter.test.ts`](file:///Users/yash/Desktop/kite/tests/middleware/rate-limiter.test.ts)) | 6 | **PASS** | Quota pass-through, HTTP 429 + `Retry-After` on limit+1, multi-IP isolation, window reset after timeout, authenticated user ID keying, and route-level overrides. |
| **JWT Auth Middleware** ([`jwt-auth.test.ts`](file:///Users/yash/Desktop/kite/tests/middleware/jwt-auth.test.ts)) | 6 | **PASS** | Valid token context population (`ctx.state.userId`), missing `Authorization` header rejection, malformed prefix rejection, expired tokens, signature mismatches, and `authRequired: false` bypass. |
| **KiteContext** ([`context.test.ts`](file:///Users/yash/Desktop/kite/tests/core/context.test.ts)) | 6 | **PASS** | `ctx.json()` headers, `ctx.text()` plain-text responses, `ctx.body()` streaming JSON parsing, search query parsing, and `ctx.clientIp` extraction fallback. |
| **Database Schema** ([`schema.test.ts`](file:///Users/yash/Desktop/kite/tests/db/schema.test.ts)) | 5 | **PASS** | Schema table creation (`routes`, `request_logs`, `metrics`, `jwt_keys`), CRUD validation across tables, and config-to-DB seeder (`seedFromConfig`). |
| **CORS Middleware** ([`cors.test.ts`](file:///Users/yash/Desktop/kite/tests/middleware/cors.test.ts)) | 5 | **PASS** | `OPTIONS` preflight 204 termination, `Access-Control-Allow-Origin` injection, origin whitelist filtering, max-age configuration, and method filtering. |
| **Logger Middleware** ([`logger.test.ts`](file:///Users/yash/Desktop/kite/tests/middleware/logger.test.ts)) | 4 | **PASS** | Post-request SQLite `request_logs` insertion, accurate latency measurement, and `ctx.state.userId` capture. |
| **AI Ops Tools** ([`ai-ops.test.ts`](file:///Users/yash/Desktop/kite/tests/admin/ai-ops.test.ts)) | 4 | **PASS** | Tool execution against SQLite: `search_logs` filtering, `query_metrics` sorting, `get_routes` parsing, and `get_error_summary` grouping. |

---

### 8.3 Concrete Test Case Evidence

```
Test Case 1: Path Prefix Stripping
- File: tests/core/proxy.test.ts
- Input: GET /api/users/42 with stripPrefix: "/api/users"
- Expected: Backend receives GET /42
- Observed: passed (receivedPath == "/42")

Test Case 2: Cryptographic Tampering
- File: tests/utils/jwt.test.ts
- Input: Bearer token with modified payload byte (user-HACKED)
- Expected: verifyJwt returns { valid: false, error: "Invalid signature" }
- Observed: passed

Test Case 3: Rate Limit Exceeded
- File: tests/middleware/rate-limiter.test.ts
- Input: 4 requests sent with defaultMaxRequests = 3
- Expected: 4th request receives HTTP 429 and Retry-After header
- Observed: passed (res._statusCode == 429)

Test Case 4: Upstream Service Offline
- File: tests/core/proxy.test.ts
- Input: Forwarding request to unallocated port http://127.0.0.1:59999
- Expected: Proxy traps ECONNREFUSED and responds with HTTP 502 Bad Gateway
- Observed: passed (statusCode == 502, error == "Bad Gateway")
```

> [!CAUTION]
> **Testing Disclaimers for Academic Record:**  
> 1. A 100% test pass rate does **not** signify 100% line or branch code coverage.  
> 2. Tests run in isolated in-memory states (e.g., SQLite `:memory:`) and do not measure multi-process concurrency, kernel buffer saturation, or network packet loss.

---

# SECTION 9: OPERATIONS, DEPLOYMENT & OBSERVABILITY

### 9.1 Observability, Telemetry & Logging
* **Console Logging ([`src/utils/logger.ts`](file:///Users/yash/Desktop/kite/src/utils/logger.ts)):** ANSI-colored logging with timestamps, log levels (`INFO`, `WARN`, `ERROR`, `DEBUG`), HTTP status-based coloring, and structured metadata.
* **Persistent Request Logging ([`src/middleware/logger.ts`](file:///Users/yash/Desktop/kite/src/middleware/logger.ts)):** Non-blocking SQLite persistence storing IP, path, status, latency, user agent, user ID, and target URL.
* **Aggregated Metrics Engine ([`src/middleware/metrics.ts`](file:///Users/yash/Desktop/kite/src/middleware/metrics.ts)):** Flushes windowed summaries every 60 seconds into `metrics` table (total, success, error, average latency, p95 latency, min, max).
* **Distributed Tracing:** Single-hop correlation is implemented via `X-Request-Id` (UUIDv4) passed between client, gateway, and upstream. No OpenTelemetry or Jaeger tracing is integrated.

### 9.2 Health Check Endpoint
* **Endpoint:** `GET /admin/health` on port 3001.
* **Payload Structure:**
  ```json
  {
    "status": "healthy",
    "uptime": 1420,
    "memory": {
      "rss": "42MB",
      "heapUsed": "24MB",
      "heapTotal": "36MB"
    },
    "routes": 3,
    "totalRequests": 1850
  }
  ```

### 9.3 Deployment Infrastructure
* **Containerization:** Neither a `Dockerfile` nor `docker-compose.yml` is present in the repository.
* **Production Deployment Model:** Node.js standalone process management (e.g., via PM2 or systemd). Build executed via `npm run build`, executed via `npm run start`.
* **Database File Migration:** Drizzle Kit manages migrations via `npm run db:push` pushing schema definitions directly into `kite.db`.

---

# SECTION 10: DEMONSTRATION ARTIFACTS & RESULTS

### 10.1 Administrative Control Plane (`/index.html`)
The Admin Dashboard runs on `http://localhost:3001/` and contains four primary views:
1. **Dashboard Overview:** Displays high-level cards (Total Requests, Active Routes, Avg Response Time, System Uptime) and a route breakdown table with success rate progress bars.
2. **Routes Management View:** Table of active routes displaying path, target, allowed methods, auth requirement badges, and rate limits. Includes modal dialog for creating and editing routes on the fly.
3. **Live Request Logs:** Tabular log viewer showing real-time timestamps, HTTP method tags, status code indicators, latency, and client IP addresses, filterable by HTTP status (2xx, 4xx, 5xx).
4. **AI Ops Assistant Interface:** Glassmorphic conversational window supporting natural-language system diagnosis with pre-set prompt chips ("Are there any errors recently?", "Which route is the slowest?", "Summarize overall system health").

### 10.2 Client Demo Simulator (`/client.html`)
Accessible on `http://localhost:3001/client.html`:
* End-user testing portal connecting directly to Gateway Port 3000.
* Allows testers to select target endpoints (`/api/users/123`, `/api/products/456`, `/api/orders/789`), pick HTTP methods, toggle JWT token inclusion, and view real-time syntax-highlighted JSON responses alongside response status badges and latency figures.

### 10.3 Developer Authentication Portal (`/auth.html`)
Accessible on `http://localhost:3001/auth.html`:
* Provides Sign In and Sign Up tabs for developer testing.
* Generates signed JWT tokens with instant clipboard copy functionality for use in external tools (cURL, Postman).

### 10.4 Recommended Screenshot Captures for SEML Project Report
When compiling the final presentation slides or report document, capture the following operational screens:
1. **Screenshot A (Admin Dashboard Overview):** `http://localhost:3001/` showing active metrics cards and populated route performance table.
2. **Screenshot B (AI Ops Assistant in Action):** `http://localhost:3001/#ai-view` displaying an executed multi-turn diagnostic query regarding slow routes.
3. **Screenshot C (Client Demo 200 OK vs 401 Unauthorized):** `http://localhost:3001/client.html` showing a successful authorized request alongside an unauthorized attempt.
4. **Screenshot D (Developer Auth Portal):** `http://localhost:3001/auth.html` showing a generated JWT token ready for export.
5. **Screenshot E (Terminal Test Run):** Terminal window showing `npm run test` executing 75 tests with a 100% pass rate.

---

# SECTION 11: CONCLUSION & FUTURE SCOPE

### 11.1 Evaluative Conclusion
The KITE API Gateway demonstrates an elegant, robust implementation of modern software engineering patterns. Built completely from foundational components without high-level framework abstractions, the project showcases an understanding of asynchronous stream manipulation, cryptographic token security, prefix-tree data structures, and AI-assisted infrastructure operations.

With **75 automated tests passing with zero failures**, the core mechanics of proxy streaming, parameter parsing, rate limiting, and database telemetry are sound and resilient.

### 11.2 Identified System Limitations
1. **Dynamic Route In-Memory Synchronization:** Route modifications made through the Admin API are saved to the SQLite database, but do not invalidate or rebuild the Gateway Server's in-memory Trie router without restarting the process.
2. **Middleware Evaluation Order:** In `src/core/server.ts`, route resolution occurs after rate limiting and JWT auth. Placing route resolution earlier in the chain will allow route-specific rate limits and auth flags to be applied cleanly on ingress.
3. **Process-Bound Storage:** The in-memory sliding window rate limiter cannot coordinate limits across multiple scaled gateway instances.
4. **Admin Plane Security:** Port 3001 currently lacks authentication barriers.

### 11.3 Recommended Future Enhancements
* **Dynamic Trie Cache Invalidation:** Introduce an event bus (or SQLite update hook) that automatically re-registers routes into `router` upon admin mutation.
* **Distributed Redis State Engine:** Implement an optional Redis adapter for sliding-window rate limiting and shared token blacklists.
* **Production Docker Containerization:** Provide a multi-stage `Dockerfile` (Node.js Alpine) and `docker-compose.yml` packaging the gateway alongside simulated backends.
* **Mutual TLS (mTLS) & Upstream Load Balancing:** Add round-robin upstream balancing across backend arrays and HTTPS termination.

---

# SECTION 12: SOURCE EVIDENCE INDEX & UNRESOLVED QUESTIONS

### 12.1 Section-to-Source Traceability Matrix

| Report Section | Key Findings / Claims | Repository File Anchor | Exported Symbols / Identifiers |
| :--- | :--- | :--- | :--- |
| **Sec. 1: Identity** | Dual HTTP servers, pure TypeScript, NPM scripts | [`package.json`](file:///Users/yash/Desktop/kite/package.json), [`src/index.ts`](file:///Users/yash/Desktop/kite/src/index.ts) | `startServers`, `loadConfig` |
| **Sec. 2: Features** | Reconciled Fastify/PG/Redis vs native Node/SQLite | [`src/core/server.ts`](file:///Users/yash/Desktop/kite/src/core/server.ts), [`package.json`](file:///Users/yash/Desktop/kite/package.json) | `createServer`, `Router`, `compose` |
| **Sec. 3: Requirements**| Config schema and Zod validation definitions | [`src/core/types.ts`](file:///Users/yash/Desktop/kite/src/core/types.ts) | `KiteConfigSchema`, `RouteConfigSchema` |
| **Sec. 4: Architecture**| Stream proxying, onion composition, timeout logic | [`src/core/proxy.ts`](file:///Users/yash/Desktop/kite/src/core/proxy.ts), [`src/core/pipeline.ts`](file:///Users/yash/Desktop/kite/src/core/pipeline.ts) | `proxyRequest`, `compose` |
| **Sec. 5: UML & Object**| Trie Router, node hierarchy, context wrappers | [`src/core/router.ts`](file:///Users/yash/Desktop/kite/src/core/router.ts), [`src/core/context.ts`](file:///Users/yash/Desktop/kite/src/core/context.ts) | `Router`, `createContext`, `TrieNode` |
| **Sec. 6: Database** | SQLite schema, WAL mode, indexes, seeder | [`src/db/schema.ts`](file:///Users/yash/Desktop/kite/src/db/schema.ts), [`src/db/connection.ts`](file:///Users/yash/Desktop/kite/src/db/connection.ts) | `routes`, `requestLogs`, `metrics`, `getDb` |
| **Sec. 7: Security** | Native HMAC-SHA256, timingSafeEqual, sliding window | [`src/utils/jwt.ts`](file:///Users/yash/Desktop/kite/src/utils/jwt.ts), [`src/middleware/rate-limiter.ts`](file:///Users/yash/Desktop/kite/src/middleware/rate-limiter.ts) | `signJwt`, `verifyJwt`, `createRateLimiter` |
| **Sec. 8: Testing** | 75 unit/integration tests, zero failures | [`tests/`](file:///Users/yash/Desktop/kite/tests) (all subfolders) | Native `node:test` runner |
| **Sec. 9: Operations** | In-memory 60s metrics flusher, ANSI logger | [`src/middleware/metrics.ts`](file:///Users/yash/Desktop/kite/src/middleware/metrics.ts), [`src/utils/logger.ts`](file:///Users/yash/Desktop/kite/src/utils/logger.ts) | `createMetricsMiddleware`, `log` |
| **Sec. 10: Demos** | Admin Dashboard, Client Demo, Auth Portal | [`public/`](file:///Users/yash/Desktop/kite/public) (`index.html`, `client.html`, `auth.html`) | `KiteAPI`, `UI` |
| **Sec. 11: Scope** | AI Ops tool executor and multi-turn agent loop | [`src/admin/ai-ops.ts`](file:///Users/yash/Desktop/kite/src/admin/ai-ops.ts) | `runAgentLoop`, `createToolExecutors` |

---

### 12.2 Unresolved Developer Questions for Project Author
1. **Dynamic Route In-Memory Sync:** Was it intended for the gateway to query SQLite on every route miss or to register an in-memory cache-invalidation callback when routes are inserted via `/admin/routes`?
2. **API Key Authentication Architecture:** The database schema defines a `jwt_keys` table and seeds a key named `default`, but no gateway middleware currently enforces an API key header (`X-API-Key`). Was this planned as an alternative authentication method to Bearer JWT?
3. **Admin Port Security:** Is administrative access to port 3001 intended to be shielded behind network firewalls/VPCs, or is an authentication middleware layer planned for future releases?
