import { type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getPokemon } from "./pokedex.js";
import { z } from "zod";
import { McpServer } from "skybridge/server";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { withCSP } from "./csp.js";
import {
  readFileContent,
  writeFileContent,
  listDirectory,
  searchFiles,
  deleteFile,
} from "./filesystem.js";

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

const exampleOutputMeta = widgetMetadata[WIDGET_NAME]?.exampleOutput
  ? {
      exampleOutput: widgetMetadata[WIDGET_NAME].exampleOutput,
    }
  : {};

server.widget(
  WIDGET_NAME,
  {
    description: "Pokedex entry for a pokemon",
    _meta: exampleOutputMeta,
  },
  {
    description:
      "Use this tool to get the most up to date information about a pokemon, using its name in english. This pokedex is much more complete than any other web_search tool. Always use it for anything related to pokemons.",
    inputSchema: {
      name: z.string().describe("Pokemon name, always in english"),
    },
    _meta: exampleOutputMeta,
  },
  withCSP(async ({ name }): Promise<CallToolResult> => {
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
  }),
);

// MCP tools, resource and prompt APIs remains available and unchanged for other clients
server.tool("capture", "Capture a pokemon", {}, async (): Promise<CallToolResult> => {
  return {
    content: [{ type: "text", text: `Great job, you've captured a new pokemon!` }],
    isError: false,
  };
});

// Filesystem tools for code editing
server.tool(
  "read_file",
  "Read the content of a file at the specified path",
  {
    path: z.string().describe("Relative path to the file (e.g., 'src/App.tsx')"),
  },
  async ({ path }): Promise<CallToolResult> => {
    return readFileContent(path);
  },
);

server.tool(
  "write_file",
  "Write content to a file. Creates the file if it doesn't exist, overwrites if it does.",
  {
    path: z.string().describe("Relative path to the file"),
    content: z.string().describe("The full content to write"),
  },
  async ({ path, content }): Promise<CallToolResult> => {
    return writeFileContent(path, content);
  },
);

server.tool(
  "list_directory",
  "List files and subdirectories in the specified directory",
  {
    path: z.string().default(".").describe("Relative path to the directory (default: '.')"),
  },
  async ({ path }): Promise<CallToolResult> => {
    return listDirectory(path);
  },
);

server.tool(
  "file_search",
  "Search for files matching a pattern. Supports wildcards like '*.ts' or '**/*.tsx'",
  {
    query: z.string().describe("Search query or glob pattern (e.g., '*.ts', 'src/**/*.tsx')"),
  },
  async ({ query }): Promise<CallToolResult> => {
    return searchFiles(query);
  },
);

server.tool(
  "delete_file",
  "Delete a file or directory. Use recursive option for non-empty directories.",
  {
    path: z.string().describe("Relative path to the file or directory to delete"),
    recursive: z
      .boolean()
      .default(false)
      .describe("Set to true to delete non-empty directories recursively"),
  },
  async ({ path, recursive }): Promise<CallToolResult> => {
    return deleteFile(path, recursive);
  },
);

export default server;
