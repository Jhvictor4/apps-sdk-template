import express, { type Express } from "express";
import path from "path";
import { fileURLToPath } from "url";

import { mountWidgetDevServer } from "@apps-sdk-template/widget-dev-server";
import { env } from "./env.js";
import { mcp } from "./middleware.js";
import server from "./server.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express() as Express;

app.use(express.json());

// MCP endpoint must be registered first
app.use(mcp(server));

if (env.NODE_ENV !== "production") {
  // Mount widget dev server with HMR support (auto-detects workspace root)
  await mountWidgetDevServer(app);
} else {
  // Production: serve static files from dist
  const webDistPath = path.resolve(__dirname, "assets");

  // Serve /dev files (widget-dev.html, test-widget.html)
  app.use("/dev", express.static(path.join(webDistPath, "dev")));

  // Serve widget bundles and other assets
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
