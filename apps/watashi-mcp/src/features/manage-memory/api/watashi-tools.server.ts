import { one, OVERWRITE, READ_ONLY, compactInput, clientOf } from "@masseater.dev/mcp-tool-call";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { Schema, pipe } from "effect";

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

const MEMORY_WRITE_SCHEMA = MemoryWriteInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
);

const MEMORY_READ_SCHEMA = MemoryReadInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
);

const SEARCH_SCHEMA = WatashiSearchInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
);

const PROFILE_SCHEMA = WatashiProfileInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
);

const MEMORY_WRITE_DESCRIPTION =
  "Write an AI work memo about a project or what you learned from life records. Pass view to show it in the portal as components instead of Markdown.";

const MEMORY_READ_DESCRIPTION = "Find and read AI work memos; call it before starting work.";

const SEARCH_DESCRIPTION = "Search the owner's life records and AI work memos in natural words.";

const PROFILE_DESCRIPTION =
  "Return USER.md, the owner's profile for agents; call it at the start of a conversation and follow it.";

const registerMemoryWrite =
  (runTool: ToolRun<ProfileServices>) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "memory_write",
      {
        description: MEMORY_WRITE_DESCRIPTION,
        inputSchema: compactInput(MEMORY_WRITE_SCHEMA),
        annotations: OVERWRITE,
      },
      (input, ctx) => writeMemory({ actor: clientOf(ctx) })(input).pipe(runTool({ count: one })),
    );
    return server;
  };

const readMemoryTool =
  (runTool: ToolRun<ProfileServices>) =>
  (input: MemoryReadValue): Promise<CallToolResult> =>
    readMemory(input).pipe(runTool({ count: one }));

const registerMemoryRead =
  (runTool: ToolRun<ProfileServices>) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "memory_read",
      {
        description: MEMORY_READ_DESCRIPTION,
        inputSchema: compactInput(MEMORY_READ_SCHEMA),
        annotations: READ_ONLY,
      },
      (input) => readMemoryTool(runTool)(input),
    );
    return server;
  };

const registerSearch =
  (runTool: ToolRun<ProfileServices>) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "watashi_search",
      {
        description: SEARCH_DESCRIPTION,
        inputSchema: compactInput(SEARCH_SCHEMA),
        annotations: READ_ONLY,
      },
      (input) => watashiSearch(input).pipe(runTool({ count: one })),
    );
    return server;
  };

const registerProfile =
  (runTool: ToolRun<ProfileServices>) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "watashi_profile",
      {
        description: PROFILE_DESCRIPTION,
        inputSchema: compactInput(PROFILE_SCHEMA),
        annotations: READ_ONLY,
      },
      (input) => watashiProfile(input).pipe(runTool({ count: one })),
    );
    return server;
  };

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
