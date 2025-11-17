import express, { type Express } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";

import type { ViteDevServer } from "vite";
import { env } from "./env.js";
import { mcp } from "./middleware.js";
import server from "./server.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express() as Express & { vite: ViteDevServer };

app.use(express.json());

// MCP endpoint must be registered first
app.use(mcp(server));

if (env.NODE_ENV !== "production") {
  // Create Vite dev server directly to access transformIndexHtml
  const { createServer, searchForWorkspaceRoot, loadConfigFromFile } = await import("vite");
  const workspaceRoot = searchForWorkspaceRoot(process.cwd());
  const webAppRoot = path.join(workspaceRoot, "web");
  const configResult = await loadConfigFromFile(
    { command: "serve", mode: "development" },
    path.join(webAppRoot, "vite.config.ts"),
    webAppRoot,
  );

  const { build, preview, ...devConfig } = configResult?.config || {};
  const vite = await createServer({
    ...devConfig,
    configFile: false,
    appType: "custom",
    server: {
      allowedHosts: true,
      middlewareMode: true,
    },
    root: webAppRoot,
    optimizeDeps: {
      include: ["react", "react-dom/client"],
    },
  });

  // Add custom middleware to serve and transform HTML files from /dev
  app.use("/dev", async (req, res, next) => {
    const htmlFiles = ["widget-dev.html", "test-widget.html"];
    const requestedFile = req.path.slice(1); // Remove leading slash

    if (htmlFiles.includes(requestedFile)) {
      const htmlPath = path.join(webAppRoot, "dev", requestedFile);

      try {
        let html = await readFile(htmlPath, "utf-8");
        // Transform HTML with Vite to process script tags and imports
        html = await vite.transformIndexHtml(req.url, html);
        res.setHeader("Content-Type", "text/html");
        res.send(html);
        return;
      } catch (error) {
        console.error(`Failed to serve ${requestedFile}:`, error);
        next(error);
        return;
      }
    }
    next();
  });

  // Mount Vite middleware
  app.use(vite.middlewares);
} else {
  // Production: serve static files from dist
  const webDistPath = path.resolve(__dirname, "../assets");
  app.use(express.static(webDistPath));
}

app.listen(3000, (error) => {
  if (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }

  console.log(`Server listening on port 3000 - ${env.NODE_ENV}`);
  console.log(`Widget dev environment: http://localhost:3000/dev/widget-dev.html`);
  console.log(
    "Make your local server accessible with 'ngrok http 3000' and connect to ChatGPT with URL https://xxxxxx.ngrok-free.app/mcp",
  );
});

process.on("SIGINT", async () => {
  console.log("Server shutdown complete");
  process.exit(0);
});
