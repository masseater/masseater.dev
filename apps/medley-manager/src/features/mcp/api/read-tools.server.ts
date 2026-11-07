import type { McpServer } from "@modelcontextprotocol/server";
import { Schema } from "effect";

import {
  getSong,
  getVideo,
  keywordOf,
  listSongs,
  listVideos,
} from "#/entities/catalog/index.server";

import { IdInput, KeywordInput, VideoSearchInput } from "./tool-input";
import { orMissing, runTool } from "./tool-result.server";

const READ_ONLY = { readOnlyHint: true, openWorldHint: false };
const KEYWORD_SCHEMA = KeywordInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);
const ID_SCHEMA = IdInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);
const VIDEO_SEARCH_SCHEMA = VideoSearchInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
);

const registerReadTools = (server: McpServer): McpServer => {
  server.registerTool(
    "search_songs",
    {
      description:
        "曲を曲名・別表記・アーティストの部分一致で探す。登録する前の表記ゆれの確認にも使う",
      inputSchema: KEYWORD_SCHEMA,
      annotations: READ_ONLY,
    },
    ({ keyword }) => runTool(keywordOf(keyword).pipe(listSongs)),
  );
  server.registerTool(
    "get_song",
    {
      description: "曲の詳細と、その曲を使った動画を、引用をたどった間接的な使用まで含めて返す",
      inputSchema: ID_SCHEMA,
      annotations: READ_ONLY,
    },
    ({ id }) => runTool(getSong(id).pipe(orMissing("song not found"))),
  );
  server.registerTool(
    "search_videos",
    {
      description: "メドレーや合作などの動画を、タイトル・動画 ID・投稿者の部分一致と種類で探す",
      inputSchema: VIDEO_SEARCH_SCHEMA,
      annotations: READ_ONLY,
    },
    (filter) => runTool(listVideos(filter)),
  );
  server.registerTool(
    "get_video",
    {
      description: "動画の詳細、パート表、この動画を引用している動画を返す",
      inputSchema: ID_SCHEMA,
      annotations: READ_ONLY,
    },
    ({ id }) => runTool(getVideo(id).pipe(orMissing("video not found"))),
  );
  return server;
};

export { registerReadTools };
