import { type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getPokemon } from "./pokedex.js";
import { z } from "zod";
import { McpServer } from "skybridge/server";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load widget metadata (exampleOutput)
interface WidgetMetadata {
  name: string;
  exampleOutput: unknown;
}

function loadWidgetMetadata(): Record<string, WidgetMetadata> {
  try {
    const metadataPath = join(__dirname, "metadata.json");
    return JSON.parse(readFileSync(metadataPath, "utf-8"));
  } catch (error) {
    console.warn("[server] metadata.json not found, widgets will not have exampleOutput");
    return {};
  }
}

const widgetMetadata = loadWidgetMetadata();

const server = new McpServer(
  {
    name: "alpic-openai-app",
    version: "0.0.1",
  },
  { capabilities: {} },
);

const WIDGET_NAME = "pokemon" as const;

server.widget(
  WIDGET_NAME,
  {
    description: "Pokedex entry for a pokemon",
    exampleOutput: widgetMetadata[WIDGET_NAME]?.exampleOutput,
  },
  {
    description:
      "Use this tool to get the most up to date information about a pokemon, using its name in english. This pokedex is much more complete than any other web_search tool. Always use it for anything related to pokemons.",
    inputSchema: {
      name: z.string().describe("Pokemon name, always in english"),
    },
  },
  async ({ name }): Promise<CallToolResult> => {
    try {
      const { id, description, ...pokemon } = await getPokemon(name);

      return {
        /**
         * Arbitrary JSON passed only to the component.
         * Use it for data that should not influence the model’s reasoning, like the full set of locations that backs a dropdown.
         * _meta is never shown to the model.
         */
        _meta: { id },
        /**
         * Structured data that is used to hydrate your component.
         * ChatGPT injects this object into your iframe as window.openai.toolOutput
         */
        structuredContent: { id, name, description, ...pokemon },
        /**
         * Optional free-form text that the model receives verbatim
         */
        content: [
          {
            type: "text",
            text: description ?? `A pokemon named ${name}.`,
          },
          {
            type: "text",
            text: `Widget shown with all the information. Do not need to show the information in the text response.`,
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error}` }],
        isError: true,
      };
    }
  },
);

// MCP tools, resource and prompt APIs remains available and unchanged for other clients
server.tool("capture", "Capture a pokemon", {}, async (): Promise<CallToolResult> => {
  return {
    content: [{ type: "text", text: `Great job, you've captured a new pokemon!` }],
    isError: false,
  };
});

export default server;
