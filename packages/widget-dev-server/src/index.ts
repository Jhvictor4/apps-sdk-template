import type { Express, RequestHandler } from "express";
import { readFile } from "fs/promises";
import path from "path";

export interface WidgetDevServerOptions {
  /**
   * Root directory of the web application (where vite.config.ts is located)
   * @default path.join(process.cwd(), "web")
   */
  webAppRoot?: string;

  /**
   * Path where widget dev HTML files are located relative to webAppRoot
   * @default "public/dev"
   */
  htmlPath?: string;

  /**
   * URL path prefix for serving widget dev pages
   * @default "/dev"
   */
  urlPrefix?: string;
}

/**
 * Creates Vite dev server middleware for widget development with HMR support
 *
 * Features:
 * - Auto-discovers and serves HTML files from configured path
 * - Injects Vite HMR client scripts via transformIndexHtml
 * - Mounts Vite middleware for module serving
 *
 * @example
 * ```typescript
 * const app = express();
 * const { devMiddleware, viteMiddleware } = await createWidgetDevServer();
 *
 * // Order matters: dev middleware first for HTML transform
 * app.use("/dev", devMiddleware);
 * app.use(viteMiddleware);
 * ```
 */
export async function createWidgetDevServer(
  options: WidgetDevServerOptions = {},
): Promise<{
  devMiddleware: RequestHandler;
  viteMiddleware: any;
  vite: any;
}> {
  // Import Vite dynamically
  const { createServer, loadConfigFromFile, searchForWorkspaceRoot } = await import("vite");

  // Find workspace root first
  const workspaceRoot = searchForWorkspaceRoot(process.cwd());

  const {
    webAppRoot = path.join(workspaceRoot, "web"),
    htmlPath = "public/dev",
  } = options;

  // Load Vite config from web app
  const configResult = await loadConfigFromFile(
    { command: "serve", mode: "development" },
    path.join(webAppRoot, "vite.config.ts"),
    webAppRoot,
  );

  // Create Vite dev server in middleware mode
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

  // Create middleware to serve and transform HTML files
  const devMiddleware: RequestHandler = async (req, res, next) => {
    // Extract filename from request path (remove leading slash)
    const requestedFile = req.path.slice(1);

    // Only handle .html files
    if (!requestedFile.endsWith(".html")) {
      next();
      return;
    }

    // Construct absolute path to HTML file
    const htmlFilePath = path.join(webAppRoot, htmlPath, requestedFile);

    try {
      // Read HTML file
      let html = await readFile(htmlFilePath, "utf-8");

      // Transform with Vite to inject HMR client scripts
      html = await vite.transformIndexHtml(req.url, html);

      // Send transformed HTML
      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      // File not found or read error - pass to next middleware
      console.error(`[widget-dev-server] Failed to serve ${requestedFile}:`, error);
      next(error);
    }
  };

  return {
    /**
     * Middleware for serving and transforming widget dev HTML files
     * Mount this at your desired URL prefix (e.g., app.use("/dev", devMiddleware))
     */
    devMiddleware,

    /**
     * Vite's native middleware for module serving and HMR
     * Mount this at root (e.g., app.use(viteMiddleware))
     */
    viteMiddleware: vite.middlewares,

    /**
     * The underlying Vite dev server instance
     * Useful for advanced use cases like custom transformations
     */
    vite,
  };
}

/**
 * Convenience function to mount widget dev server on Express app
 *
 * @example
 * ```typescript
 * const app = express();
 * await mountWidgetDevServer(app);
 * ```
 */
export async function mountWidgetDevServer(
  app: Express,
  options: WidgetDevServerOptions = {},
): Promise<{
  devMiddleware: RequestHandler;
  viteMiddleware: any;
}> {
  const { urlPrefix = "/dev" } = options;
  const { devMiddleware, viteMiddleware } = await createWidgetDevServer(options);

  // Mount dev middleware at URL prefix
  app.use(urlPrefix, devMiddleware);

  // Mount Vite middleware at root
  app.use(viteMiddleware);

  return { devMiddleware, viteMiddleware };
}
