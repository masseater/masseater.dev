import { OVERWRITE, READ_ONLY, toolInputOf } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import type { DrizzleD1Database } from "drizzle-orm/d1";

import { getStats } from "#/entities/catalog/index.server.ts";
import { IdInput, KeywordInput, MergeInput } from "#/entities/catalog/index.ts";
import { getPerson, listPeople } from "#/entities/person/index.server.ts";
import { orMissing, runTool } from "#/shared/api/index.server.ts";
import type { CatalogRelations } from "#/shared/db/index.server.ts";
import { keywordOf } from "#/shared/db/index.server.ts";

import { mergePeople } from "./person-write.server.ts";

const KEYWORD_SCHEMA = toolInputOf(KeywordInput);
const ID_SCHEMA = toolInputOf(IdInput);

export const registerPersonTools =
  (db: DrizzleD1Database<CatalogRelations>) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "search_people",
      {
        description: "担当者を名前と別名義の部分一致で探す",
        inputSchema: KEYWORD_SCHEMA,
        annotations: READ_ONLY,
      },
      ({ keyword }) => runTool(db)(keywordOf(keyword).pipe(listPeople)),
    );
    server.registerTool(
      "get_person",
      {
        description: "担当者の詳細と担当したパートを返す",
        inputSchema: ID_SCHEMA,
        annotations: READ_ONLY,
      },
      ({ id }) => runTool(db)(getPerson(id).pipe(orMissing("person not found"))),
    );
    server.registerTool(
      "get_stats",
      { description: "曲・動画・パート・担当者の登録件数を返す", annotations: READ_ONLY },
      () => runTool(db)(getStats),
    );
    server.registerTool(
      "merge_people",
      {
        description: "重複した担当者をまとめる。消す側の名前と別名義は残す側の別名義になる",
        inputSchema: toolInputOf(MergeInput),
        annotations: OVERWRITE,
      },
      (input) => runTool(db)(mergePeople(input)),
    );
    return server;
  };
