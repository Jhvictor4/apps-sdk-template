import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import "@/index.css";

// Vite glob import: preload all widget modules at build time
const widgets = import.meta.glob<{ default: React.ComponentType }>("./widgets/*.tsx");

/**
 * Widget Development Loader
 *
 * Dynamically loads widget based on ?widget=<name> URL parameter
 * Example: http://localhost:5173/widget-dev.html?widget=pokemon
 */
function WidgetLoader() {
  const [WidgetComponent, setWidgetComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

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
