import { OVERWRITE, WRITE, toolInputOf } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import type { DrizzleD1Database } from "drizzle-orm/d1";

import { CreateVideoInput, IdInput, UpdateVideoInput } from "#/entities/catalog/index.ts";
import { runTool } from "#/shared/api/index.server.ts";
import type { CatalogRelations } from "#/shared/db/index.server.ts";

import { createVideo, deleteVideo, updateVideo } from "./video-write.server.ts";

export const registerVideoTools =
  (db: DrizzleD1Database<CatalogRelations>) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "create_video",
      {
        description:
          "メドレー・合作・単品などの動画を登録する。パート表は set_video_parts で登録する",
        inputSchema: toolInputOf(CreateVideoInput),
        annotations: WRITE,
      },
      (input) => runTool(db)(createVideo(input)),
    );
    server.registerTool(
      "update_video",
      {
        description: "動画の情報のうち、指定した項目だけを書き換える。null を渡すと消す",
        inputSchema: toolInputOf(UpdateVideoInput),
        annotations: WRITE,
      },
      (input) => runTool(db)(updateVideo(input)),
    );
    server.registerTool(
      "delete_video",
      {
        description: "動画をパート表ごと消す",
        inputSchema: toolInputOf(IdInput),
        annotations: OVERWRITE,
      },
      ({ id }) => runTool(db)(deleteVideo(id)),
    );
    return server;
  };
