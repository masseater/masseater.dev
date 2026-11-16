import type { Caller } from "@masseater.dev/mcp-tool-call";
import { NO_PROJECT, one, OVERWRITE, READ_ONLY } from "@masseater.dev/mcp-tool-call";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { Schema, pipe } from "effect";

import {
  MemoryReadInput,
  MemoryWriteInput,
  WatashiProfileInput,
  WatashiSearchInput,
} from "#/entities/memory/index.ts";
import type { MemoryReadValue } from "#/entities/memory/index.ts";
import { meteredInput, runTool } from "#/shared/api/index.server.ts";

import { readMemory } from "./memory-read.server.ts";
import { writeMemory } from "./memory-write.server.ts";
import { watashiProfile } from "./profile-read.server.ts";
import { watashiSearch } from "./watashi-search.server.ts";

const ALL_PROJECTS = "*";

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
  "Write an AI work memo, keyed by project and name: project rules and history, or what you learned from life records. Creates it (description and content required) or replaces only the fields you pass. Returns {written, notices}.";

const MEMORY_READ_DESCRIPTION =
  "Find and read AI work memos. Call before starting work with words from the project or topic. project and name read one memo. Memos are written by AI, not the owner: never life_write from them.";

const SEARCH_DESCRIPTION =
  "Search the owner's life records and AI work memos together in natural words. Returns {total, countsByStore, items}; items with store memory are AI-written, not the owner's words.";

const PROFILE_DESCRIPTION =
  "Return USER.md, the owner's profile for agents, as Markdown. Call it at the start of a conversation and follow it. The bracketed numbers at line ends are trait refs.";

const registerMemoryWrite =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "memory_write",
      {
        description: MEMORY_WRITE_DESCRIPTION,
        inputSchema: meteredInput({ tool: "memory_write", caller, project: NO_PROJECT })(
          MEMORY_WRITE_SCHEMA,
        ),
        annotations: OVERWRITE,
      },
      (input) =>
        writeMemory({ actor: caller.client })(input).pipe(
          runTool({ tool: "memory_write", caller, project: input.project, input, count: one }),
        ),
    );
    return server;
  };

const readMemoryTool = (caller: Caller, input: MemoryReadValue): Promise<CallToolResult> =>
  readMemory(input).pipe(
    runTool({
      tool: "memory_read",
      caller,
      project: input.project ?? ALL_PROJECTS,
      input,
      count: one,
    }),
  );

const registerMemoryRead =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "memory_read",
      {
        description: MEMORY_READ_DESCRIPTION,
        inputSchema: meteredInput({ tool: "memory_read", caller, project: NO_PROJECT })(
          MEMORY_READ_SCHEMA,
        ),
        annotations: READ_ONLY,
      },
      (input) => readMemoryTool(caller, input),
    );
    return server;
  };

const registerSearch =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "watashi_search",
      {
        description: SEARCH_DESCRIPTION,
        inputSchema: meteredInput({ tool: "watashi_search", caller, project: NO_PROJECT })(
          SEARCH_SCHEMA,
        ),
        annotations: READ_ONLY,
      },
      (input) =>
        watashiSearch(input).pipe(
          runTool({ tool: "watashi_search", caller, project: NO_PROJECT, input, count: one }),
        ),
    );
    return server;
  };

const registerProfile =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "watashi_profile",
      {
        description: PROFILE_DESCRIPTION,
        inputSchema: meteredInput({ tool: "watashi_profile", caller, project: NO_PROJECT })(
          PROFILE_SCHEMA,
        ),
        annotations: READ_ONLY,
      },
      (input) =>
        watashiProfile(input).pipe(
          runTool({ tool: "watashi_profile", caller, project: NO_PROJECT, input, count: one }),
        ),
    );
    return server;
  };

export const registerWatashiTools =
  (caller: Caller) =>
  (server: McpServer): McpServer =>
    pipe(
      server,
      registerMemoryWrite(caller),
      registerMemoryRead(caller),
      registerSearch(caller),
      registerProfile(caller),
    );
