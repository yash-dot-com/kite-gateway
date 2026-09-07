import http from "node:http";

const PORTS = process.argv[2] ? process.argv[2].split(',').map(p => parseInt(p, 10)) : [4001, 4002, 4003];

PORTS.forEach(PORT => {
  const server = http.createServer((req, res) => {
    // Add some latency occasionally to test metrics
    const delay = Math.random() > 0.8 ? 500 : 50;

    setTimeout(() => {
      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", backend: PORT }));
        return;
      }

      if (req.url === "/error") {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Simulated backend error" }));
        return;
      }

      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        res.writeHead(req.method === "POST" ? 201 : 200, {
          "Content-Type": "application/json",
        });
        res.end(
          JSON.stringify({
            message: `Hello from mock backend on port ${PORT}`,
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: body ? JSON.parse(body) : null,
          })
        );
      });
    }, delay);
  });

  server.listen(PORT, () => {
    console.log(`Mock backend listening on http://localhost:${PORT}`);
  });
});
