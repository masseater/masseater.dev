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
  "Write one or more of the owner's life records when the owner tells you about events, health, mood, meals, spending, people, media, plans, goals or reflections. Write only what the owner said in this conversation (source: said), gave as a file or screen (provided) or linked from a service (imported), never AI memos or guesses. One event is one life_event; put numbers to count in values (a drinking party: kind met, values {drinks, yen}). Times are ISO 8601 times, dates, months or years; a time without a zone is Asia/Tokyo. Returns {written, notices}; fix what a notice's hint says or ask the owner. On error nothing was written, except the refs listed after `Already written`.";

const READ_DESCRIPTION =
  "Read the owner's life records; every input is optional. Without record, searches life_event, profile_fact and owner_reflection. record: digest returns material to review the from–to period; record: event_kind lists kinds, metrics, people, places, tags and topics. Times are ISO 8601; a time without a zone is Asia/Tokyo. Returns {total, items, notices}.";

const STATS_DESCRIPTION =
  "Aggregate metrics between from and to (inclusive, ISO 8601) and compare with the previous period. Use it instead of counting records yourself. Metric and kind names come from life_read record: event_kind. Returns one summary per metric.";

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
