import type { McpServer } from "@modelcontextprotocol/server";
import { Schema } from "effect";

import { getPerson, getStats, keywordOf, listPeople } from "#/entities/catalog/index.server";

import { mergePeople } from "./person-write.server";
import { IdInput, KeywordInput, MergeInput } from "./tool-input";
import { orMissing, runTool } from "./tool-result.server";

const READ_ONLY = { readOnlyHint: true, openWorldHint: false };
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };
const KEYWORD_SCHEMA = KeywordInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);
const ID_SCHEMA = IdInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const registerPersonTools = (server: McpServer): McpServer => {
  server.registerTool(
    "search_people",
    {
      description: "担当者を名前と別名義の部分一致で探す",
      inputSchema: KEYWORD_SCHEMA,
      annotations: READ_ONLY,
    },
    ({ keyword }) => runTool(keywordOf(keyword).pipe(listPeople)),
  );
  server.registerTool(
    "get_person",
    {
      description: "担当者の詳細と担当したパートを返す",
      inputSchema: ID_SCHEMA,
      annotations: READ_ONLY,
    },
    ({ id }) => runTool(getPerson(id).pipe(orMissing("person not found"))),
  );
  server.registerTool(
    "get_stats",
    { description: "曲・動画・パート・担当者の登録件数を返す", annotations: READ_ONLY },
    () => runTool(getStats),
  );
  server.registerTool(
    "merge_people",
    {
      description: "重複した担当者をまとめる。消す側の名前と別名義は残す側の別名義になる",
      inputSchema: MergeInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
      annotations: DESTRUCTIVE,
    },
    (input) => runTool(mergePeople(input)),
  );
  return server;
};

export { registerPersonTools };
