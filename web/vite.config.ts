import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { skybridge } from "skybridge/web";

// https://vite.dev/config/
export default defineConfig({
  plugins: [skybridge(), react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Multi-page app configuration
  build: {
    rollupOptions: {
      input: {
        "widget-dev": path.resolve(__dirname, "dev/widget-dev.html"),
        "test-widget": path.resolve(__dirname, "dev/test-widget.html"),
      },
    },
  },

  server: {
    port: 5173,
    host: true, // 외부 접근 허용 (widgetui-builder iframe)
    cors: {
      origin: "*", // 개발 환경에서 모든 origin 허용
      credentials: true,
    },
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 5173,
    },
  },
});
