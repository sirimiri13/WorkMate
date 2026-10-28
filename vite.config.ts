import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Khi chạy `npm run dev`, phục vụ các function trong /api giống như Vercel làm khi deploy.
function devApi(): Plugin {
  return {
    name: "dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const match = req.url?.match(/^\/api\/([\w-]+)/);
        if (!match) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${match[1]}.ts`);
          const handler = mod[req.method ?? "GET"];
          if (typeof handler !== "function") {
            res.statusCode = 405;
            return res.end();
          }
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const request = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers: { "content-type": req.headers["content-type"] ?? "application/json" },
            body: chunks.length ? Buffer.concat(chunks) : undefined,
          });
          const response: Response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(await response.text());
        } catch (err) {
          server.config.logger.error(String(err));
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Đưa biến trong .env vào process.env để code trong /api đọc được khi dev.
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if ((key.startsWith("ANTHROPIC_") || key.startsWith("GEMINI_")) && value) process.env[key] ??= value;
  }
  return {
    plugins: [react(), tailwindcss(), devApi()],
    // Cho phép truy cập qua tunnel public (Tailscale Funnel, ngrok).
    server: { allowedHosts: [".ts.net", ".ngrok-free.app", ".ngrok-free.dev", ".ngrok.app"] },
  };
});
