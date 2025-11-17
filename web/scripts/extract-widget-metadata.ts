#!/usr/bin/env tsx
/**
 * Extract Widget Metadata Script
 *
 * Simple approach: Just read source code and extract example data from shared package.
 * No compilation needed!
 */

import { glob } from "glob";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface WidgetMetadata {
  name: string;
  exampleOutput: unknown;
}

async function main() {
  console.log("[extract-metadata] Extracting widget metadata...");

  const webRoot = path.resolve(__dirname, "..");
  const widgetFiles = await glob("src/widgets/*.tsx", {
    cwd: webRoot,
    absolute: false,
  });

  if (widgetFiles.length === 0) {
    console.warn("[extract-metadata] No *.tsx files found in src/widgets/");
    return;
  }

  const metadataMap: Record<string, WidgetMetadata> = {};

  // Import shared package
  const shared = await import("@apps-sdk-template/shared");

  for (const widgetFile of widgetFiles) {
    try {
      const widgetName = path.basename(widgetFile, ".tsx");
      const content = await fs.readFile(path.join(webRoot, widgetFile), "utf-8");

      // Check if file uses defineWidget
      if (!content.includes("defineWidget")) {
        console.log(`[extract-metadata] ⊘ Skipping ${widgetName} (no defineWidget usage)`);
        continue;
      }

      // Parse exampleOutput from defineWidget call
      // Match: exampleOutput: examplePokemonData
      const exampleMatch = content.match(/exampleOutput:\s*(\w+)/);

      if (exampleMatch) {
        const exampleName = exampleMatch[1];

        // Get example from shared package
        if (shared[exampleName]) {
          metadataMap[widgetName] = {
            name: widgetName,
            exampleOutput: shared[exampleName],
          };
          console.log(`[extract-metadata] ✓ Extracted metadata for: ${widgetName} (using ${exampleName})`);
        } else {
          console.warn(`[extract-metadata] ⚠ ${widgetName}: ${exampleName} not found in shared package`);
        }
      } else {
        console.warn(`[extract-metadata] ⚠ ${widgetName}: Could not parse exampleOutput`);
      }
    } catch (error) {
      console.error(`[extract-metadata] Failed to process ${widgetFile}:`, error);
    }
  }

  // Write widget-metadata.json
  const outputDir = path.resolve(webRoot, "dist");
  await fs.mkdir(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, "widget-metadata.json");
  await fs.writeFile(outputPath, JSON.stringify(metadataMap, null, 2), "utf-8");

  console.log(`[extract-metadata] ✓ Generated widget-metadata.json with ${Object.keys(metadataMap).length} widgets`);
}

main().catch((error) => {
  console.error("[extract-metadata] Fatal error:", error);
  process.exit(1);
});
