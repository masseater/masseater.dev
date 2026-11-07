import { Schema } from "effect";

import { TODO_PRIORITIES, TODO_STATUSES } from "./todo.table";

const MemoryBody = Schema.Struct({
  project: Schema.String,
  name: Schema.String,
  description: Schema.String,
  content: Schema.String,
});

const TodoBody = Schema.Struct({
  title: Schema.String,
  note: Schema.String,
  status: Schema.Literals(TODO_STATUSES),
  priority: Schema.Literals(TODO_PRIORITIES),
  dueOn: Schema.String,
});

type MemoryBodyValue = typeof MemoryBody.Type;

type TodoBodyValue = typeof TodoBody.Type;

export { MemoryBody, TodoBody };
export type { MemoryBodyValue, TodoBodyValue };
