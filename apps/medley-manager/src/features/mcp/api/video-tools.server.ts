import type { McpServer } from "@modelcontextprotocol/server";
import { Schema } from "effect";

import { CreateVideoInput, IdInput, UpdateVideoInput } from "./tool-input";
import { runTool } from "./tool-result.server";
import { createVideo, deleteVideo, updateVideo } from "./video-write.server";

const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };

const registerVideoTools = (server: McpServer): McpServer => {
  server.registerTool(
    "create_video",
    {
      description:
        "メドレー・合作・単品などの動画を登録する。パート表は set_video_parts で登録する",
      inputSchema: CreateVideoInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
      annotations: WRITE,
    },
    (input) => runTool(createVideo(input)),
  );
  server.registerTool(
    "update_video",
    {
      description: "動画の情報のうち、指定した項目だけを書き換える。null を渡すと消す",
      inputSchema: UpdateVideoInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
      annotations: WRITE,
    },
    (input) => runTool(updateVideo(input)),
  );
  server.registerTool(
    "delete_video",
    {
      description: "動画をパート表ごと消す",
      inputSchema: IdInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
      annotations: DESTRUCTIVE,
    },
    ({ id }) => runTool(deleteVideo(id)),
  );
  return server;
};

export { registerVideoTools };
