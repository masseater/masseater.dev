import type { McpServer } from "@modelcontextprotocol/server";
import { Schema } from "effect";

import { createSong, deleteSong, mergeSongs, updateSong } from "./song-write.server";
import { CreateSongInput, IdInput, MergeInput, UpdateSongInput } from "./tool-input";
import { runTool } from "./tool-result.server";

const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };
const CREATE_SCHEMA = CreateSongInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
);
const UPDATE_SCHEMA = UpdateSongInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
);
const ID_SCHEMA = IdInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);
const MERGE_SCHEMA = MergeInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const registerSongTools = (server: McpServer): McpServer => {
  server.registerTool(
    "create_song",
    {
      description: "原曲を登録する。重複しないよう、先に search_songs で確かめる",
      inputSchema: CREATE_SCHEMA,
      annotations: WRITE,
    },
    (input) => runTool(createSong(input)),
  );
  server.registerTool(
    "update_song",
    {
      description: "曲の情報のうち、指定した項目だけを書き換える。null を渡すと消す",
      inputSchema: UPDATE_SCHEMA,
      annotations: WRITE,
    },
    (input) => runTool(updateSong(input)),
  );
  server.registerTool(
    "delete_song",
    {
      description: "曲を消す。その曲を使ったパートは残り、曲とのつながりだけが外れる",
      inputSchema: ID_SCHEMA,
      annotations: DESTRUCTIVE,
    },
    ({ id }) => runTool(deleteSong(id)),
  );
  server.registerTool(
    "merge_songs",
    {
      description:
        "重複した曲をまとめる。消す側の曲名と別表記は残す側の別表記になり、パートは残す側につながる",
      inputSchema: MERGE_SCHEMA,
      annotations: DESTRUCTIVE,
    },
    (input) => runTool(mergeSongs(input)),
  );
  return server;
};

export { registerSongTools };
