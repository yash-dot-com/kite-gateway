# 🪁 KITE API Gateway

**KITE** is a lightweight, high-performance API Gateway and Reverse Proxy built from scratch using Node.js and TypeScript. It is designed to act as the single entry point for a microservices architecture, providing essential edge capabilities like dynamic routing, authentication, rate limiting, and observability.

Built for an **SDLC Lab Presentation**, this project demonstrates software engineering best practices, including a modular architecture, robust middleware pipelines, comprehensive automated testing (100% pass rate across 75 tests), and an innovative **AI Ops Assistant** for intelligent infrastructure monitoring.

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
- **Premium UI**: A stunning, responsive, dark-themed dashboard built purely with Vanilla HTML/CSS/JS (utilizing glassmorphism aesthetics).
- **Live Route Management**: Create, edit, and delete proxy routes on the fly without restarting the server.
- **Client Demo Portal**: A built-in simulator (`/client.html`) to test authenticated and public proxy routes directly from the browser.

### 🤖 AI Ops Assistant (Beta)
- Integrates the **Groq SDK** to provide a conversational AI interface directly within the Admin Dashboard.
- Capable of querying the SQLite database using function/tool calling to analyze slow requests, summarize error logs, and report on system health in real-time.

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
# Run all 75 unit and integration tests
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
