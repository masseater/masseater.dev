import type { Caller } from "@masseater.dev/mcp-tool-call";
import { one, OVERWRITE, READ_ONLY } from "@masseater.dev/mcp-tool-call";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { Schema, pipe } from "effect";

import { LifeReadInput, LifeStatsInput, LifeWriteInput } from "#/entities/life-record/index.ts";
import type { LifeReadValue } from "#/entities/life-record/index.ts";
import { meteredInput, runTool } from "#/shared/api/index.server.ts";

import { routeLifeRead } from "./life-read-route.server.ts";
import { lifeStats } from "./life-stats.server.ts";
import { writeLife } from "./life-write.server.ts";

const LIFE_PROJECT = "life";

const WRITE_SCHEMA = LifeWriteInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const READ_SCHEMA = LifeReadInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const STATS_SCHEMA = LifeStatsInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const WRITE_DESCRIPTION =
  "Write the owner's life records when the owner tells you about events, health, mood, meals, spending, people, media, plans, goals or reflections.";

const READ_DESCRIPTION = "Read the owner's life records.";

const STATS_DESCRIPTION =
  "Aggregate the owner's metrics over a period instead of counting records yourself.";

const registerWrite =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "life_write",
      {
        description: WRITE_DESCRIPTION,
        inputSchema: meteredInput({ tool: "life_write", caller, project: LIFE_PROJECT })(
          WRITE_SCHEMA,
        ),
        annotations: OVERWRITE,
      },
      (input) =>
        writeLife({ actor: caller.client })(input.records).pipe(
          runTool({
            tool: "life_write",
            caller,
            project: LIFE_PROJECT,
            input,
            count: ({ written }) => written.length,
          }),
        ),
    );
    return server;
  };

const readLife = (caller: Caller, input: LifeReadValue): Promise<CallToolResult> =>
  routeLifeRead(input).pipe(
    runTool({ tool: "life_read", caller, project: LIFE_PROJECT, input, count: one }),
  );

const registerRead =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "life_read",
      {
        description: READ_DESCRIPTION,
        inputSchema: meteredInput({ tool: "life_read", caller, project: LIFE_PROJECT })(
          READ_SCHEMA,
        ),
        annotations: READ_ONLY,
      },
      (input) => readLife(caller, input),
    );
    return server;
  };

const registerStats =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "life_stats",
      {
        description: STATS_DESCRIPTION,
        inputSchema: meteredInput({ tool: "life_stats", caller, project: LIFE_PROJECT })(
          STATS_SCHEMA,
        ),
        annotations: READ_ONLY,
      },
      (input) =>
        lifeStats(input).pipe(
          runTool({
            tool: "life_stats",
            caller,
            project: LIFE_PROJECT,
            input,
            count: (stats) => stats.length,
          }),
        ),
    );
    return server;
  };

export const registerLifeTools =
  (caller: Caller) =>
  (server: McpServer): McpServer =>
    pipe(server, registerWrite(caller), registerRead(caller), registerStats(caller));
