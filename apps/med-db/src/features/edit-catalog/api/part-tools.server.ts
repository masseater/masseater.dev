import { OVERWRITE, WRITE, toolInputOf } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import type { DrizzleD1Database } from "drizzle-orm/d1";

import { PartIdInput, UpdatePartInput, VideoPartsInput } from "#/entities/catalog/index.ts";
import { runTool } from "#/shared/api/index.server.ts";
import type { CatalogRelations } from "#/shared/db/index.server.ts";

import { addParts, deletePart, setVideoParts, updatePart } from "./part-write.server.ts";

const PARTS_SCHEMA = toolInputOf(VideoPartsInput);

export const registerPartTools =
  (db: DrizzleD1Database<CatalogRelations>) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "set_video_parts",
      {
        description:
          "動画のパート表を丸ごと差し替える。配列の順がパートの順になる。既存のパートのコメントも消えるので、登録済みの動画では先に get_video で確かめる。表記ゆれが疑われる曲は先に search_songs で確かめ、既存の表記に合わせるか add_song_alias で別表記を足す",
        inputSchema: PARTS_SCHEMA,
        annotations: OVERWRITE,
      },
      (input) => runTool(db)(setVideoParts(input)),
    );
    server.registerTool(
      "add_parts",
      {
        description: "動画のパート表の末尾にパートを足す",
        inputSchema: PARTS_SCHEMA,
        annotations: WRITE,
      },
      (input) => runTool(db)(addParts(input)),
    );
    server.registerTool(
      "update_part",
      {
        description:
          "パートを 1 件、指定した項目だけ書き換える。担当者は指定した役割ごとに置き換える。partId は get_video で分かる",
        inputSchema: toolInputOf(UpdatePartInput),
        annotations: WRITE,
      },
      (input) => runTool(db)(updatePart(input)),
    );
    server.registerTool(
      "delete_part",
      {
        description: "パートを 1 件消す",
        inputSchema: toolInputOf(PartIdInput),
        annotations: OVERWRITE,
      },
      ({ partId }) => runTool(db)(deletePart(partId)),
    );
    return server;
  };
