import type { McpServer } from "@modelcontextprotocol/server";
import { Option, Schema, pipe } from "effect";

import type { Caller } from "./caller";
import { saveMemory, searchMemories, updateMemory } from "./memory-store.server";
import { runTool } from "./tool-call.server";
import { DEFAULT_LIMIT, SaveInput, SearchInput, UpdateInput } from "./tool-input";

const ALL_PROJECTS = "*";
const ONE = 1;

const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
const OVERWRITE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };
const READ_ONLY = { readOnlyHint: true, openWorldHint: false };

const SAVE_SCHEMA = SaveInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);
const UPDATE_SCHEMA = UpdateInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);
const SEARCH_SCHEMA = SearchInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const one = (): number => ONE;

const registerSave =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "save",
      {
        description:
          "新しい記憶を保存する。同じプロジェクトに同じ名前があれば失敗するので、先に search で確かめ、あれば update を使う",
        inputSchema: SAVE_SCHEMA,
        annotations: WRITE,
      },
      (input) =>
        saveMemory(input).pipe(
          runTool({ tool: "save", caller, project: input.project, input, count: one }),
        ),
    );
    return server;
  };

const registerUpdate =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "update",
      {
        description: "既存の記憶の要約か本文を書き換える。渡した項目だけを置き換える",
        inputSchema: UPDATE_SCHEMA,
        annotations: OVERWRITE,
      },
      (input) =>
        updateMemory(input).pipe(
          runTool({ tool: "update", caller, project: input.project, input, count: one }),
        ),
    );
    return server;
  };

const registerSearch =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "search",
      {
        description:
          "記憶を探す。作業を始める前に、題材のプロジェクトや話題の語で呼び、関係する決定や好みを読む",
        inputSchema: SEARCH_SCHEMA,
        annotations: READ_ONLY,
      },
      (input) =>
        searchMemories({
          query: input.query,
          project: Option.fromUndefinedOr(input.project),
          limit: input.limit ?? DEFAULT_LIMIT,
        }).pipe(
          runTool({
            tool: "search",
            caller,
            project: input.project ?? ALL_PROJECTS,
            input,
            count: (rows) => rows.length,
          }),
        ),
    );
    return server;
  };

const registerMemoryTools =
  (caller: Caller) =>
  (server: McpServer): McpServer =>
    pipe(server, registerSave(caller), registerUpdate(caller), registerSearch(caller));

export { registerMemoryTools };
