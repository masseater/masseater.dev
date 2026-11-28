import {
  one,
  OVERWRITE,
  READ_ONLY,
  clientOf,
  toolInputOf,
  registeredTool,
} from "@masseater.dev/mcp-tool-call";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { pipe } from "effect";

import {
  MemoryReadInput,
  MemoryWriteInput,
  WatashiProfileInput,
  WatashiSearchInput,
} from "#/entities/memory/index.ts";
import type { MemoryReadValue } from "#/entities/memory/index.ts";
import type { ToolRun } from "#/shared/api/index.server.ts";

import { readMemory } from "./memory-read.server.ts";
import { writeMemory } from "./memory-write.server.ts";
import { watashiProfile } from "./profile-read.server.ts";
import type { ProfileServices } from "./profile-read.server.ts";
import { watashiSearch } from "./watashi-search.server.ts";

const MEMORY_WRITE_SCHEMA = toolInputOf(MemoryWriteInput);

const MEMORY_READ_SCHEMA = toolInputOf(MemoryReadInput);

const SEARCH_SCHEMA = toolInputOf(WatashiSearchInput);

const PROFILE_SCHEMA = toolInputOf(WatashiProfileInput);

const MEMORY_WRITE_DESCRIPTION =
  "Write an AI work memo about a project or what you learned from life records. Pass view to show it in the portal as components instead of Markdown.";

const MEMORY_READ_DESCRIPTION = "Find and read AI work memos; call it before starting work.";

const SEARCH_DESCRIPTION = "Search the owner's life records and AI work memos in natural words.";

const PROFILE_DESCRIPTION =
  "Return USER.md, the owner's profile for agents; call it at the start of a conversation and follow it.";

const registerMemoryWrite = (
  runTool: ToolRun<ProfileServices>,
): ((server: McpServer) => McpServer) =>
  registeredTool(
    {
      name: "memory_write",
      description: MEMORY_WRITE_DESCRIPTION,
      inputSchema: MEMORY_WRITE_SCHEMA,
      annotations: OVERWRITE,
    },
    (input, ctx) => writeMemory({ actor: clientOf(ctx) })(input).pipe(runTool({ count: one })),
  );

const readMemoryTool =
  (runTool: ToolRun<ProfileServices>) =>
  (input: MemoryReadValue): Promise<CallToolResult> =>
    readMemory(input).pipe(runTool({ count: one }));

const registerMemoryRead = (
  runTool: ToolRun<ProfileServices>,
): ((server: McpServer) => McpServer) =>
  registeredTool(
    {
      name: "memory_read",
      description: MEMORY_READ_DESCRIPTION,
      inputSchema: MEMORY_READ_SCHEMA,
      annotations: READ_ONLY,
    },
    (input) => readMemoryTool(runTool)(input),
  );

const registerSearch = (runTool: ToolRun<ProfileServices>): ((server: McpServer) => McpServer) =>
  registeredTool(
    {
      name: "watashi_search",
      description: SEARCH_DESCRIPTION,
      inputSchema: SEARCH_SCHEMA,
      annotations: READ_ONLY,
    },
    (input) => watashiSearch(input).pipe(runTool({ count: one })),
  );

const registerProfile = (runTool: ToolRun<ProfileServices>): ((server: McpServer) => McpServer) =>
  registeredTool(
    {
      name: "watashi_profile",
      description: PROFILE_DESCRIPTION,
      inputSchema: PROFILE_SCHEMA,
      annotations: READ_ONLY,
    },
    (input) => watashiProfile(input).pipe(runTool({ count: one })),
  );

export const registerWatashiTools =
  (runTool: ToolRun<ProfileServices>) =>
  (server: McpServer): McpServer =>
    pipe(
      server,
      registerMemoryWrite(runTool),
      registerMemoryRead(runTool),
      registerSearch(runTool),
      registerProfile(runTool),
    );
