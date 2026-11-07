import type { McpServer } from "@modelcontextprotocol/server";
import { Schema, pipe } from "effect";

import type { Caller } from "./caller";
import { DEFAULT_HISTORY_LIMIT, HistoryInput, RestoreInput } from "./history-input";
import { listHistory } from "./history-store.server";
import { restoreRecord } from "./restore.server";
import { NO_PROJECT, READ_ONLY, WRITE, one, runTool } from "./tool-call.server";

const HISTORY_SCHEMA = HistoryInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);
const RESTORE_SCHEMA = RestoreInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const registerHistory =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "history",
      {
        description:
          "記憶か ToDo の書き込みの履歴を新しい順に返す。各リビジョンに、書いた後の中身・操作・書いたクライアント・日時が入る",
        inputSchema: HISTORY_SCHEMA,
        annotations: READ_ONLY,
      },
      (input) =>
        listHistory({ ...input, limit: input.limit ?? DEFAULT_HISTORY_LIMIT }).pipe(
          runTool({
            tool: "history",
            caller,
            project: NO_PROJECT,
            input,
            count: (rows) => rows.length,
          }),
        ),
    );
    return server;
  };

const registerRestore =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "restore",
      {
        description:
          "記憶か ToDo を history の rev の中身に戻す。戻した結果も新しいリビジョンとして履歴に積む",
        inputSchema: RESTORE_SCHEMA,
        annotations: WRITE,
      },
      (input) =>
        restoreRecord({ actor: caller.client })(input).pipe(
          runTool({ tool: "restore", caller, project: NO_PROJECT, input, count: one }),
        ),
    );
    return server;
  };

const registerHistoryTools =
  (caller: Caller) =>
  (server: McpServer): McpServer =>
    pipe(server, registerHistory(caller), registerRestore(caller));

export { registerHistoryTools };
