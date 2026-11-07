import type { McpServer } from "@modelcontextprotocol/server";
import { Schema, pipe } from "effect";

import type { Caller } from "./caller";
import { DEFAULT_TODO_LIMIT, TodoAddInput, TodoListInput, TodoUpdateInput } from "./todo-input";
import { addTodo, listTodos, updateTodo } from "./todo-store.server";
import { NO_PROJECT, READ_ONLY, WRITE, one, runTool } from "./tool-call.server";

const DEFAULT_STATUS = "open";

const NO_QUERY = "";

const ADD_SCHEMA = TodoAddInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);
const UPDATE_SCHEMA = TodoUpdateInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
);
const LIST_SCHEMA = TodoListInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const registerAdd =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "todo_add",
      {
        description: "持ち主の ToDo を 1 件足す。足した ToDo を id つきで返す",
        inputSchema: ADD_SCHEMA,
        annotations: WRITE,
      },
      (input) =>
        addTodo(input).pipe(
          runTool({ tool: "todo_add", caller, project: NO_PROJECT, input, count: one }),
        ),
    );
    return server;
  };

const registerUpdate =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "todo_update",
      {
        description:
          "ToDo を id で書き換える。渡した項目だけを置き換える。終えたら status を done、やめたら canceled にする",
        inputSchema: UPDATE_SCHEMA,
        annotations: WRITE,
      },
      (input) =>
        updateTodo(input).pipe(
          runTool({ tool: "todo_update", caller, project: NO_PROJECT, input, count: one }),
        ),
    );
    return server;
  };

const registerList =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "todo_list",
      {
        description:
          "ToDo を優先度の高い順、同じ優先度は期限の近い順に返す。既定は未完了（open）だけ",
        inputSchema: LIST_SCHEMA,
        annotations: READ_ONLY,
      },
      (input) =>
        listTodos({
          status: input.status ?? DEFAULT_STATUS,
          query: input.query ?? NO_QUERY,
          limit: input.limit ?? DEFAULT_TODO_LIMIT,
        }).pipe(
          runTool({
            tool: "todo_list",
            caller,
            project: NO_PROJECT,
            input,
            count: (rows) => rows.length,
          }),
        ),
    );
    return server;
  };

const registerTodoTools =
  (caller: Caller) =>
  (server: McpServer): McpServer =>
    pipe(server, registerAdd(caller), registerUpdate(caller), registerList(caller));

export { registerTodoTools };
