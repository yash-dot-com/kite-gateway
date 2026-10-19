# 🪁 KITE API Gateway

**KITE** is a lightweight, high-performance API Gateway and Reverse Proxy built from scratch using Node.js and TypeScript. It is designed to act as the single entry point for a microservices architecture, providing essential edge capabilities like dynamic routing, authentication, rate limiting, and observability.

Built for an **SDLC Lab Presentation**, this project demonstrates software engineering best practices, including a modular architecture, robust middleware pipelines, comprehensive automated testing (100% pass rate across 79 tests), and an innovative **AI Ops Assistant** for intelligent infrastructure monitoring.

---

## ✨ Core Features

### 🔌 Gateway & Proxy Engine
- **Trie-based Router**: Highly efficient `O(K)` routing engine supporting exact matches, parameterized routes (e.g., `/api/users/:id`), and wildcard prefix stripping.
- **Stream-based Proxy**: Forwards requests asynchronously using Node's native `http.request`, ensuring minimal memory footprint while injecting necessary `X-Forwarded-*` headers.
- **Koa-style Middleware Pipeline**: Elegant onion-model composition supporting asynchronous downstream/upstream flow and double-call protection.

### 🛡️ Edge Security & Traffic Control
- **JWT Authentication**: Native HMAC-SHA256 token verification (no external crypto dependencies). Routes can be dynamically configured to enforce or bypass authentication.
- **Sliding Window Rate Limiter**: Memory-efficient rate limiting per IP (or per User ID if authenticated) to prevent abuse and DDoS attacks.
- **CORS Management**: Dynamically injects cross-origin resource sharing headers.

### 📊 Observability & Persistence
- **SQLite + Drizzle ORM**: Uses `better-sqlite3` and `drizzle-orm` for blazingly fast, persistent storage of Gateway configuration, Request Logs, and Aggregated Metrics.
- **Idempotent Seeder**: Automatically boots up the database schema and loads initial routes from `kite.config.json`.

### 🎛️ Admin Dashboard & Client Demo
- **Premium UI**: A responsive dashboard built purely with Vanilla HTML/CSS/JS, with a light theme and an optional dark mode. The theme toggle on the dashboard, client demo, and auth portal remembers your preference across pages.
- **Live Route Management**: Create, edit, and delete proxy routes on the fly without restarting the server.
- **Client Demo Portal**: A built-in simulator (`/client.html`) to test authenticated and public proxy routes directly from the browser.

### 🤖 AI Ops Assistant (Beta)
- Integrates the **Groq SDK** to provide a conversational AI interface directly within the Admin Dashboard.
- Capable of querying the SQLite database using function/tool calling to analyze slow requests, summarize error logs, and report on system health in real-time.
- Renders configured route maps, error distribution maps, and expected request sequences inline using Pele 1.6.0. Try **"Show my configured gateway route map"** or **"Visualize errors in the last hour by path and status"**. The assistant queries its tools first and labels observed data, sample limits, and time ranges. Diagrams support light/dark themes, zoom when needed, and expandable source. Pele loads from a pinned CDN URL; if unavailable or a diagram is invalid, the answer and source remain readable. Request sequences explain expected flow and observed outcomes; they are not distributed traces.

---

## 🛠️ Technology Stack

- **Runtime**: Node.js v22+
- **Language**: TypeScript
- **Database**: SQLite (`better-sqlite3`)
- **ORM**: Drizzle ORM
- **Testing**: Native `node:test` + `node:assert`
- **AI Integration**: Groq SDK
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (No frameworks)

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have Node.js v20.6+ installed (which natively supports `--env-file`).

### 2. Installation
```bash
# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory and add your Groq API key (required for the AI Ops Assistant):
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
```

### 4. Running the Project

For a demonstration, start the gateway and all three mock microservices with one command:

```bash
npm run demo
```

Open **[http://localhost:3001](http://localhost:3001)** and use the **Request Playground** sidebar tab. This command loads `.env` when present; the AI assistant requires `GROQ_API_KEY`, while the request playground works without it. Press **Ctrl+C** to stop all demo processes. Stop any separately running gateway or mock services first to avoid port conflicts.

You can also run the processes separately:

To fully test the Gateway, you should run the Mock Backends and the Gateway simultaneously.

**Terminal 1: Start Mock Backends**
Spins up three lightweight simulated backend services on ports `4001`, `4002`, and `4003`.
```bash
npm run mock
```

**Terminal 2: Start the KITE Gateway**
Starts the Proxy Gateway on Port `3000` and the Admin Server on Port `3001`.
```bash
npm run dev
```

---

## 💻 Usage & Interfaces

Once the servers are running, you can access the following interfaces:

### Admin Dashboard (Port 3001)
Access the main control plane at:
**[http://localhost:3001](http://localhost:3001)**
- View real-time traffic metrics and gateway uptime.
- Manage routes and view raw request logs.
- Chat with the AI Ops Assistant to diagnose issues.
- Send requests from **Request Playground**, generate a demo JWT, and run traffic through every configured GET route without leaving the dashboard. Responses, recent logs, total requests, and route metrics update after each request.

### Presentation flow (one dashboard)

1. Run `npm run demo` and open `http://localhost:3001`.
2. Open the **Request Playground** tab, select `/api/products/*` and click **Send request**. The public request returns **200** from the Products service on port **4002**. Expand the response to show the forwarded path and backend headers.
3. Select `/api/users/*`, uncheck **Attach saved token**, and send. Show the **401** response and the matching recent activity row.
4. Click **Generate demo token**, check **Attach saved token**, and send again. Show **200** from the Users service on port **4001**. This uses the existing mock JWT endpoint; no separate auth page is needed.
5. Set **Requests per route** to **3**, then click **Run all GET routes**. This sends **9 real requests** through the three default routes, including Orders on port **4003**. Inspect each response, then switch to **Dashboard** to show the increased request count and updated route metrics. Each run is limited to 50 requests, sent sequentially.
6. Select Products, choose **POST**, and send the editable JSON body. Show the **201** response and echoed body.
7. Switch back to **GET**, change the request path to `/api/products/error`, and send. Show the simulated **500** and recent gateway activity, then open **Dashboard** to show the updated success rate.
8. Open **Logs** for the complete request history, or **AI Ops** for a summary if a Groq API key is configured.

The playground reads the existing route list and sends requests to the gateway, never directly to mock backends. The default gateway URL uses the current hostname on port 3000; edit it if your gateway uses another address. Parameter and wildcard routes receive a suggested `123` value that you can edit. **Run all GET routes** uses the generated paths and GET methods; **Send request** uses your selected method, path, and JSON body. HTTP failures remain visible as responses, and network failures are reported separately. The mocks echo requests rather than maintaining real Users, Products, or Orders records.

### Client Demo App
Access the interactive API testing tool at:
**[http://localhost:3001/client.html](http://localhost:3001/client.html)**
- Simulate an end-user application.
- Log in to receive a JWT.
- Fire requests at the Gateway (`http://localhost:3000`) and view the formatted JSON responses from the backend.

### Developer Auth Portal
Access the token generation utility at:
**[http://localhost:3001/auth.html](http://localhost:3001/auth.html)**
- Generate mock JWTs for testing APIs via external tools like Postman or cURL.

---

## 🧪 Testing

The project includes a rigorous, dependency-free test suite utilizing Node's native test runner.

```bash
# Run all 79 unit and integration tests
npm run test
```

**Coverage Includes:**
- Middleware Pipeline logic and error propagation.
- Trie Router exact, parameterized, and wildcard path matching.
- JWT signing and verification edge cases (expired tokens, invalid signatures).
- Proxy request forwarding and header injection.
- AI Ops tool-calling executors.

---

## 📐 System Architecture

1. **Client Request** → hits Gateway on Port `3000`.
2. **Pipeline** → Request flows through `ErrorHandler` → `Metrics` → `Logger` → `CORS` → `RateLimiter` → `JwtAuth`.
3. **Router** → Matches the request path (`/api/users/123`) to a configured target (`http://localhost:4001`).
4. **Proxy** → Streams the request to the target backend and pipes the response back to the client.
5. **Admin Server** → Runs concurrently on Port `3001` providing the UI and APIs for managing the system SQLite database.
