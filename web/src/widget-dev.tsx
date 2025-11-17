import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import "@/index.css";

// Vite glob import: preload all widget modules at build time
const widgets = import.meta.glob<{ default: React.ComponentType }>("./widgets/*.tsx");

/**
 * No window.openai Fallback Page
 * Design: OpenAI Apps in ChatGPT Design System
 */
function NoOpenAIFallback() {
  const currentUrl = window.location.href;

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{
        backgroundColor: "#FFFFFF",
        fontFamily: "SF Pro, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      <div className="w-full max-w-[600px]" style={{ padding: "32px" }}>
        {/* Header */}
        <div className="mb-8">
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 600,
              lineHeight: "28px",
              letterSpacing: "-0.25px",
              color: "#0D0D0D",
              marginBottom: "8px",
            }}
          >
            window.openai Not Available
          </h1>
          <p
            style={{
              fontSize: "14px",
              fontWeight: 400,
              lineHeight: "18px",
              letterSpacing: "-0.3px",
              color: "#5D5D5D",
            }}
          >
            This widget requires <code style={{ fontFamily: "monospace", color: "#0D0D0D" }}>window.openai</code> to be
            injected by a parent iframe.
          </p>
        </div>

        {/* Instructions */}
        <div className="space-y-6">
          <div>
            <h2
              style={{
                fontSize: "14px",
                fontWeight: 600,
                lineHeight: "18px",
                letterSpacing: "-0.3px",
                color: "#0D0D0D",
                marginBottom: "12px",
              }}
            >
              How to use this widget
            </h2>
            <ol className="ml-5 space-y-2" style={{ listStyleType: "decimal" }}>
              <li
                style={{
                  fontSize: "14px",
                  fontWeight: 400,
                  lineHeight: "18px",
                  letterSpacing: "-0.3px",
                  color: "#5D5D5D",
                }}
              >
                Load this page inside an iframe
              </li>
              <li
                style={{
                  fontSize: "14px",
                  fontWeight: 400,
                  lineHeight: "18px",
                  letterSpacing: "-0.3px",
                  color: "#5D5D5D",
                }}
              >
                Inject <code style={{ fontFamily: "monospace" }}>window.openai</code> from parent window
              </li>
              <li
                style={{
                  fontSize: "14px",
                  fontWeight: 400,
                  lineHeight: "18px",
                  letterSpacing: "-0.3px",
                  color: "#5D5D5D",
                }}
              >
                Widget will automatically detect and load
              </li>
            </ol>
          </div>

          {/* Code Example */}
          <div
            style={{
              backgroundColor: "#F3F3F3",
              borderRadius: "8px",
              padding: "16px",
              border: "1px solid rgba(13, 13, 13, 0.05)",
            }}
          >
            <h3
              style={{
                fontSize: "12px",
                fontWeight: 600,
                lineHeight: "16px",
                letterSpacing: "-0.1px",
                color: "#0D0D0D",
                marginBottom: "8px",
              }}
            >
              Example code
            </h3>
            <pre
              style={{
                fontFamily: "monospace",
                fontSize: "12px",
                lineHeight: "16px",
                color: "#5D5D5D",
                overflowX: "auto",
                margin: 0,
              }}
            >
              {`const iframe = document.querySelector('iframe');
iframe.contentWindow.openai = {
  callTool: async (name, params) => {
    return { structuredContent: data };
  }
};`}
            </pre>
          </div>

          {/* Current URL */}
          <div
            style={{
              backgroundColor: "#F3F3F3",
              borderRadius: "8px",
              padding: "12px",
              border: "1px solid rgba(13, 13, 13, 0.05)",
            }}
          >
            <p
              style={{
                fontSize: "12px",
                fontWeight: 400,
                lineHeight: "16px",
                letterSpacing: "-0.1px",
                color: "#8F8F8F",
                marginBottom: "4px",
              }}
            >
              Current URL
            </p>
            <p
              style={{
                fontSize: "12px",
                fontFamily: "monospace",
                lineHeight: "16px",
                color: "#5D5D5D",
                wordBreak: "break-all",
              }}
            >
              {currentUrl}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="mt-8 flex items-center gap-2">
          <span
            className="h-2 w-2 animate-pulse rounded-full"
            style={{ backgroundColor: "#0285FF" }}
          ></span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 400,
              lineHeight: "16px",
              letterSpacing: "-0.1px",
              color: "#8F8F8F",
            }}
          >
            Waiting for window.openai injection...
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Widget Development Loader
 *
 * Dynamically loads widget based on ?widget=<name> URL parameter
 * Example: http://localhost:5173/widget-dev.html?widget=pokemon
 */
function WidgetLoader() {
  const [WidgetComponent, setWidgetComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasOpenAI, setHasOpenAI] = useState<boolean>(false);

  // Check for window.openai availability
  useEffect(() => {
    const checkOpenAI = () => {
      if (window.openai) {
        console.log("[WidgetLoader] ✓ window.openai detected");
        setHasOpenAI(true);
        return true;
      }
      return false;
    };

    // Initial check
    if (checkOpenAI()) return;

    // Poll every 500ms for window.openai injection
    console.log("[WidgetLoader] ⏳ Waiting for window.openai injection...");
    const interval = setInterval(() => {
      if (checkOpenAI()) {
        clearInterval(interval);
      }
    }, 500);

    // Cleanup after 30 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!window.openai) {
        console.warn("[WidgetLoader] ⚠ window.openai not detected after 30s");
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Load widget once window.openai is available
  useEffect(() => {
    if (!hasOpenAI) return;

    const params = new URLSearchParams(window.location.search);
    const widgetName = params.get("widget") || "pokemon";

    console.log(`[WidgetLoader] Loading widget: ${widgetName}`);
    console.log(`[WidgetLoader] Available widgets:`, Object.keys(widgets));

    const widgetPath = `./widgets/${widgetName}.tsx`;
    const loader = widgets[widgetPath];

    if (!loader) {
      const availableWidgets = Object.keys(widgets)
        .map((path) => path.replace("./widgets/", "").replace(".tsx", ""))
        .join(", ");
      const errorMsg = `Widget "${widgetName}" not found. Available: ${availableWidgets}`;
      console.error(`[WidgetLoader] ${errorMsg}`);
      setError(errorMsg);
      return;
    }

    loader()
      .then((module) => {
        console.log(`[WidgetLoader] Widget "${widgetName}" loaded successfully`);
        setWidgetComponent(() => module.default);
      })
      .catch((err) => {
        const errorMsg = `Failed to load widget "${widgetName}": ${err.message}`;
        console.error(`[WidgetLoader] ${errorMsg}`, err);
        setError(errorMsg);
      });
  }, [hasOpenAI]);

  // Show fallback if window.openai not available
  if (!hasOpenAI) {
    return <NoOpenAIFallback />;
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="mb-2 text-lg font-semibold text-red-800">Error Loading Widget</h2>
          <p className="text-sm text-red-600">{error}</p>
          <p className="mt-4 text-xs text-gray-500">
            Try: <code className="rounded bg-gray-100 px-2 py-1">?widget=pokemon</code>
          </p>
        </div>
      </div>
    );
  }

  if (!WidgetComponent) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return <WidgetComponent />;
}

// Mount the widget loader
const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <WidgetLoader />
    </StrictMode>
  );
}
