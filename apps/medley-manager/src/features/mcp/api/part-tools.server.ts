import type { McpServer } from "@modelcontextprotocol/server";
import { Schema } from "effect";

import { addParts, deletePart, setVideoParts, updatePart } from "./part-write.server";
import { PartIdInput, UpdatePartInput, VideoPartsInput } from "./tool-input";
import { runTool } from "./tool-result.server";

const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };
const PARTS_SCHEMA = VideoPartsInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const registerPartTools = (server: McpServer): McpServer => {
  server.registerTool(
    "set_video_parts",
    {
      description:
        "動画のパート表を丸ごと差し替える。配列の順がパートの順になる。既存のパートのコメントも消えるので、登録済みの動画では先に get_video で確かめる。表記ゆれが疑われる曲は先に search_songs で確かめ、既存の表記に合わせるか add_song_alias で別表記を足す",
      inputSchema: PARTS_SCHEMA,
      annotations: DESTRUCTIVE,
    },
    (input) => runTool(setVideoParts(input)),
  );
  server.registerTool(
    "add_parts",
    {
      description: "動画のパート表の末尾にパートを足す",
      inputSchema: PARTS_SCHEMA,
      annotations: WRITE,
    },
    (input) => runTool(addParts(input)),
  );
  server.registerTool(
    "update_part",
    {
      description:
        "パートを 1 件、指定した項目だけ書き換える。担当者は指定した役割ごとに置き換える。partId は get_video で分かる",
      inputSchema: UpdatePartInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
      annotations: WRITE,
    },
    (input) => runTool(updatePart(input)),
  );
  server.registerTool(
    "delete_part",
    {
      description: "パートを 1 件消す",
      inputSchema: PartIdInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
      annotations: DESTRUCTIVE,
    },
    ({ partId }) => runTool(deletePart(partId)),
  );
  return server;
};

export { registerPartTools };
