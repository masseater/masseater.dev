import { compactInput } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Schema } from "effect";

import { CreateVideoInput, IdInput, UpdateVideoInput } from "#/entities/catalog/index.ts";
import { runTool } from "#/shared/api/index.server.ts";
import type { CatalogRelations } from "#/shared/db/index.server.ts";

import { createVideo, deleteVideo, updateVideo } from "./video-write.server.ts";

const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };

export const registerVideoTools =
  (db: DrizzleD1Database<CatalogRelations>) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "create_video",
      {
        description:
          "メドレー・合作・単品などの動画を登録する。パート表は set_video_parts で登録する",
        inputSchema: CreateVideoInput.pipe(
          Schema.toStandardSchemaV1,
          Schema.toStandardJSONSchemaV1,
          compactInput,
        ),
        annotations: WRITE,
      },
      (input) => runTool(db)(createVideo(input)),
    );
    server.registerTool(
      "update_video",
      {
        description: "動画の情報のうち、指定した項目だけを書き換える。null を渡すと消す",
        inputSchema: UpdateVideoInput.pipe(
          Schema.toStandardSchemaV1,
          Schema.toStandardJSONSchemaV1,
          compactInput,
        ),
        annotations: WRITE,
      },
      (input) => runTool(db)(updateVideo(input)),
    );
    server.registerTool(
      "delete_video",
      {
        description: "動画をパート表ごと消す",
        inputSchema: IdInput.pipe(
          Schema.toStandardSchemaV1,
          Schema.toStandardJSONSchemaV1,
          compactInput,
        ),
        annotations: DESTRUCTIVE,
      },
      ({ id }) => runTool(db)(deleteVideo(id)),
    );
    return server;
  };
