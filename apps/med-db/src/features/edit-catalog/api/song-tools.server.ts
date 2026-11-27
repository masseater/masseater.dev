import { OVERWRITE, WRITE, compactInput } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Schema } from "effect";

import { CreateSongInput, IdInput, MergeInput, UpdateSongInput } from "#/entities/catalog/index.ts";
import { runTool } from "#/shared/api/index.server.ts";
import type { CatalogRelations } from "#/shared/db/index.server.ts";

import { createSong, deleteSong, mergeSongs, updateSong } from "./song-write.server.ts";

const CREATE_SCHEMA = CreateSongInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
  compactInput,
);
const UPDATE_SCHEMA = UpdateSongInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
  compactInput,
);
const ID_SCHEMA = IdInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
  compactInput,
);
const MERGE_SCHEMA = MergeInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
  compactInput,
);

export const registerSongTools =
  (db: DrizzleD1Database<CatalogRelations>) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "create_song",
      {
        description: "原曲を登録する。重複しないよう、先に search_songs で確かめる",
        inputSchema: CREATE_SCHEMA,
        annotations: WRITE,
      },
      (input) => runTool(db)(createSong(input)),
    );
    server.registerTool(
      "update_song",
      {
        description: "曲の情報のうち、指定した項目だけを書き換える。null を渡すと消す",
        inputSchema: UPDATE_SCHEMA,
        annotations: WRITE,
      },
      (input) => runTool(db)(updateSong(input)),
    );
    server.registerTool(
      "delete_song",
      {
        description: "曲を消す。その曲を使ったパートは残り、曲とのつながりだけが外れる",
        inputSchema: ID_SCHEMA,
        annotations: OVERWRITE,
      },
      ({ id }) => runTool(db)(deleteSong(id)),
    );
    server.registerTool(
      "merge_songs",
      {
        description:
          "重複した曲をまとめる。消す側の曲名と別表記は残す側の別表記になり、パートは残す側につながる",
        inputSchema: MERGE_SCHEMA,
        annotations: OVERWRITE,
      },
      (input) => runTool(db)(mergeSongs(input)),
    );
    return server;
  };
