import { OVERWRITE, WRITE, compactInput } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Schema } from "effect";

import { SongAliasInput } from "#/entities/catalog/index.ts";
import { runTool } from "#/shared/api/index.server.ts";
import type { CatalogRelations } from "#/shared/db/index.server.ts";

import { addSongAlias, removeSongAlias } from "./song-write.server.ts";

const ALIAS_SCHEMA = SongAliasInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
  compactInput,
);

export const registerSongAliasTools =
  (db: DrizzleD1Database<CatalogRelations>) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "add_song_alias",
      {
        description: "曲に別表記を足す。名寄せに使う",
        inputSchema: ALIAS_SCHEMA,
        annotations: WRITE,
      },
      (input) => runTool(db)(addSongAlias(input)),
    );
    server.registerTool(
      "remove_song_alias",
      { description: "曲から別表記を外す", inputSchema: ALIAS_SCHEMA, annotations: OVERWRITE },
      (input) => runTool(db)(removeSongAlias(input)),
    );
    return server;
  };
