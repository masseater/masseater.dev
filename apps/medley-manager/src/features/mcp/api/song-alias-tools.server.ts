import type { McpServer } from "@modelcontextprotocol/server";
import { Schema } from "effect";

import { addSongAlias, removeSongAlias } from "./song-write.server";
import { SongAliasInput } from "./tool-input";
import { runTool } from "./tool-result.server";

const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };
const ALIAS_SCHEMA = SongAliasInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const registerSongAliasTools = (server: McpServer): McpServer => {
  server.registerTool(
    "add_song_alias",
    {
      description: "曲に別表記を足す。名寄せに使う",
      inputSchema: ALIAS_SCHEMA,
      annotations: WRITE,
    },
    (input) => runTool(addSongAlias(input)),
  );
  server.registerTool(
    "remove_song_alias",
    { description: "曲から別表記を外す", inputSchema: ALIAS_SCHEMA, annotations: DESTRUCTIVE },
    (input) => runTool(removeSongAlias(input)),
  );
  return server;
};

export { registerSongAliasTools };
