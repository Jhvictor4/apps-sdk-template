import express, { type Express } from "express";
import path from "path";
import { fileURLToPath } from "url";

import { widgetsDevServer } from "skybridge/server";
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
  // Mount Vite dev server at root (as required by widgetsDevServer)
  const viteMiddleware = await widgetsDevServer();

  // Add custom middleware to serve HTML files from web root
  app.use(async (req, res, next) => {
    const htmlFiles = ["widget-dev.html", "test-widget.html"];
    const requestedFile = req.path.slice(1); // Remove leading slash

    if (htmlFiles.includes(requestedFile)) {
      const webRoot = path.resolve(__dirname, "../../web");
      const htmlPath = path.join(webRoot, requestedFile);

      try {
        const { readFile } = await import("fs/promises");
        const html = await readFile(htmlPath, "utf-8");
        res.setHeader("Content-Type", "text/html");
        res.send(html);
        return;
      } catch (error) {
        console.error(`Failed to serve ${requestedFile}:`, error);
      }
    }
    next();
  });

  app.use(viteMiddleware);
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
  console.log(`Widget dev environment: http://localhost:3000/widget-dev.html`);
  console.log(
    "Make your local server accessible with 'ngrok http 3000' and connect to ChatGPT with URL https://xxxxxx.ngrok-free.app/mcp",
  );
});

process.on("SIGINT", async () => {
  console.log("Server shutdown complete");
  process.exit(0);
});
