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

import { LifeReadInput, LifeStatsInput, LifeWriteInput } from "#/entities/life-record/index.ts";
import type { LifeReadValue } from "#/entities/life-record/index.ts";
import type { ToolRun } from "#/shared/api/index.server.ts";
import type { Database } from "#/shared/db/index.server.ts";

import { routeLifeRead } from "./life-read-route.server.ts";
import { lifeStats } from "./life-stats.server.ts";
import { writeLife } from "./life-write.server.ts";

const WRITE_SCHEMA = toolInputOf(LifeWriteInput);

const READ_SCHEMA = toolInputOf(LifeReadInput);

const STATS_SCHEMA = toolInputOf(LifeStatsInput);

const WRITE_DESCRIPTION =
  "Write the owner's life records when the owner tells you about events, health, mood, meals, spending, people, media, plans, goals or reflections.";

const READ_DESCRIPTION = "Read the owner's life records.";

const STATS_DESCRIPTION =
  "Aggregate the owner's metrics over a period instead of counting records yourself.";

const registerWrite = (runTool: ToolRun<Database>): ((server: McpServer) => McpServer) =>
  registeredTool(
    {
      name: "life_write",
      description: WRITE_DESCRIPTION,
      inputSchema: WRITE_SCHEMA,
      annotations: OVERWRITE,
    },
    (input, ctx) =>
      writeLife({ actor: clientOf(ctx) })(input.records).pipe(
        runTool({ count: ({ written }) => written.length }),
      ),
  );

const readLife =
  (runTool: ToolRun<Database>) =>
  (input: LifeReadValue): Promise<CallToolResult> =>
    routeLifeRead(input).pipe(runTool({ count: one }));

const registerRead = (runTool: ToolRun<Database>): ((server: McpServer) => McpServer) =>
  registeredTool(
    {
      name: "life_read",
      description: READ_DESCRIPTION,
      inputSchema: READ_SCHEMA,
      annotations: READ_ONLY,
    },
    (input) => readLife(runTool)(input),
  );

const registerStats = (runTool: ToolRun<Database>): ((server: McpServer) => McpServer) =>
  registeredTool(
    {
      name: "life_stats",
      description: STATS_DESCRIPTION,
      inputSchema: STATS_SCHEMA,
      annotations: READ_ONLY,
    },
    (input) => lifeStats(input).pipe(runTool({ count: (stats) => stats.length })),
  );

export const registerLifeTools =
  (runTool: ToolRun<Database>) =>
  (server: McpServer): McpServer =>
    pipe(server, registerWrite(runTool), registerRead(runTool), registerStats(runTool));
