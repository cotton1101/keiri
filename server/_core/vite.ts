import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express, basePath: string = "") {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(basePath || "/", express.static(distPath));

  // fall through to index.html if the file doesn't exist
  // Inject page-specific meta tags for SEO crawlers
  app.use(`${basePath}/*`, (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    const html = fs.readFileSync(indexPath, "utf-8");

    // Check if the request is for the landing page (root)
    const reqPath = req.path.replace(basePath, "").replace(/^\/+/, "");
    if (!reqPath || reqPath === "/" || reqPath === "index.html") {
      // Landing page already has comprehensive meta tags from build
      res.set("Content-Type", "text/html").send(html);
      return;
    }

    // For login/register pages, inject specific meta tags
    const siteUrl = process.env.SITE_URL || "https://sns-tool.online/keiri";
    let pageHtml = html;
    if (reqPath === "login") {
      pageHtml = html
        .replace(/<title>[^<]*<\/title>/, "<title>ログイン | カンタン経理</title>")
        .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${siteUrl}/login" />`);
    } else if (reqPath === "register") {
      pageHtml = html
        .replace(/<title>[^<]*<\/title>/, "<title>無料アカウント作成 | カンタン経理 - 個人事業主のためのクラウド経理ソフト</title>")
        .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${siteUrl}/register" />`);
    }

    res.set("Content-Type", "text/html").send(pageHtml);
  });

  // Redirect base path without trailing slash
  if (basePath) {
    app.get(basePath, (_req, res) => {
      res.redirect(301, `${basePath}/`);
    });
  }
}
