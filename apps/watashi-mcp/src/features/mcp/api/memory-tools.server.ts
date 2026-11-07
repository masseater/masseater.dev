import type { McpServer } from "@modelcontextprotocol/server";
import { Option, Schema, pipe } from "effect";

import type { Caller } from "./caller";
import { DEFAULT_LIMIT, SaveInput, SearchInput, UpdateInput } from "./memory-input";
import { searchMemories } from "./memory-store.server";
import { changeMemory, createMemory } from "./memory-writer.server";
import {
  OVERWRITE,
  READ_ONLY,
  WRITE,
  one,
  runTool,
  NO_PROJECT,
  meteredInput,
} from "./tool-call.server";

const ALL_PROJECTS = "*";

const SAVE_SCHEMA = SaveInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);
const UPDATE_SCHEMA = UpdateInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);
const SEARCH_SCHEMA = SearchInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const registerSave =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "memory_save",
      {
        description:
          "新しい記憶を保存する。同じプロジェクトに同じ名前があれば失敗するので、先に memory_search で確かめ、あれば memory_update を使う",
        inputSchema: meteredInput({ tool: "memory_save", caller, project: NO_PROJECT })(
          SAVE_SCHEMA,
        ),
        annotations: WRITE,
      },
      (input) =>
        createMemory({ actor: caller.client })(input).pipe(
          runTool({ tool: "memory_save", caller, project: input.project, input, count: one }),
        ),
    );
    return server;
  };

const registerUpdate =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "memory_update",
      {
        description: "既存の記憶の要約か本文を書き換える。渡した項目だけを置き換える",
        inputSchema: meteredInput({ tool: "memory_update", caller, project: NO_PROJECT })(
          UPDATE_SCHEMA,
        ),
        annotations: OVERWRITE,
      },
      (input) =>
        changeMemory({ actor: caller.client, op: "update" })(input).pipe(
          runTool({ tool: "memory_update", caller, project: input.project, input, count: one }),
        ),
    );
    return server;
  };

const registerSearch =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "memory_search",
      {
        description:
          "記憶を探す。作業を始める前に、題材のプロジェクトや話題の語で呼び、関係する決定や好みを読む",
        inputSchema: meteredInput({ tool: "memory_search", caller, project: NO_PROJECT })(
          SEARCH_SCHEMA,
        ),
        annotations: READ_ONLY,
      },
      (input) =>
        searchMemories({
          query: input.query,
          project: Option.fromUndefinedOr(input.project),
          limit: input.limit ?? DEFAULT_LIMIT,
        }).pipe(
          runTool({
            tool: "memory_search",
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
