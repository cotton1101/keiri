import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { stripeRouter } from "../stripe";
import { seedInMemoryAdmin } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Base path for subdirectory deployment (e.g. "/keiri")
  const basePath = (process.env.BASE_PATH || "/").replace(/\/$/, "") || "";

  // ─── Security Headers ───
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
    // CSP は本番のみ適用（開発は Vite が inline script/eval/ws を使うため）
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      res.setHeader("Content-Security-Policy", [
        "default-src 'self'",
        "img-src 'self' data: blob: https:",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "script-src 'self' https://js.stripe.com",
        "connect-src 'self' https://api.stripe.com",
        "frame-src https://checkout.stripe.com https://billing.stripe.com",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "));
    }
    next();
  });

  // ─── SEO: robots.txt & sitemap.xml ───
  const siteUrl = process.env.SITE_URL || "https://sns-tool.online/keiri";
  app.get(`${basePath}/robots.txt`, (_req, res) => {
    res.type("text/plain").send(
      `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /settings\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${siteUrl}/sitemap.xml\n`
    );
  });
  app.get(`${basePath}/sitemap.xml`, (_req, res) => {
    const urls = [
      { loc: `${siteUrl}/`, priority: "1.0", changefreq: "weekly" },
      { loc: `${siteUrl}/login`, priority: "0.6", changefreq: "monthly" },
      { loc: `${siteUrl}/register`, priority: "0.7", changefreq: "monthly" },
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
    res.type("application/xml").send(xml);
  });

  // Stripe webhook must be registered BEFORE express.json() for raw body access
  app.use(basePath || "/", stripeRouter);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback (kept for backward compatibility)
  registerOAuthRoutes(app);
  // ─── CSRF protection ─── state変更系(POST)にはカスタムヘッダを必須化。
  // ブラウザの単純リクエストではカスタムヘッダを付けられないため、クロスサイトからの mutation を遮断する。
  app.use(`${basePath}/api/trpc`, (req, res, next) => {
    if (req.method === "POST" && req.headers["x-requested-with"] !== "XMLHttpRequest") {
      return res.status(403).json({ error: "CSRF protection: missing X-Requested-With header" });
    }
    next();
  });
  // tRPC API
  app.use(
    `${basePath}/api/trpc`,
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app, basePath);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Seed in-memory admin user if no DATABASE_URL
  await seedInMemoryAdmin();

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
