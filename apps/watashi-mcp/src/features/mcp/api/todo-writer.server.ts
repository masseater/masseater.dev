import { eq, max } from "drizzle-orm";
import { Effect } from "effect";

import type { TodoBodyValue } from "#/features/mcp/model/record-body";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";
import { TodoNotFound } from "#/features/mcp/model/todo-not-found";
import { NO_DUE_DATE, todo } from "#/features/mcp/model/todo.table";
import type { Todo, TodoPriority, TodoStatus } from "#/features/mcp/model/todo.table";
import { db } from "#/shared/db/index.server";

import type { ChangeOp, Writer } from "./memory-writer.server";
import { commit } from "./revision-writer.server";
import { firstRow, nextAfterMax, nowIso, query } from "./storage.server";

type NewTodo = Readonly<{ title: string; note?: string; priority?: TodoPriority; dueOn?: string }>;

type TodoChange = Readonly<{
  id: number;
  title?: string;
  note?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  dueOn?: string;
}>;

const FIRST_ID = 1;

const bodyOf = ({ title, note, status, priority, dueOn }: Todo): TodoBodyValue => ({
  title,
  note,
  status,
  priority,
  dueOn,
});

const nextId: Effect.Effect<number, StorageFailed> = query(() =>
  db.select({ max: max(todo.id) }).from(todo),
).pipe(Effect.map(nextAfterMax));

const createTodo =
  ({ actor }: Writer) =>
  ({
    title,
    note = "",
    priority = "normal",
    dueOn = NO_DUE_DATE,
  }: NewTodo): Effect.Effect<Todo, StorageFailed> =>
    Effect.gen(function* createTodoRecord() {
      const now = yield* nowIso;
      const id = yield* nextId;
      const row: Todo = {
        id,
        title,
        note,
        status: "open",
        priority,
        dueOn,
        createdAt: now,
        updatedAt: now,
      };
      yield* commit({
        entity: "todo",
        entityId: String(id),
        op: "create",
        body: bodyOf(row),
        actor,
        at: now,
      })(db.insert(todo).values(row));
      return row;
    });

const changeTodo =
  ({ actor, op }: Writer & Readonly<{ op: ChangeOp }>) =>
  ({ id, ...change }: TodoChange): Effect.Effect<Todo, TodoNotFound | StorageFailed> =>
    Effect.gen(function* changeTodoRecord() {
      const current = yield* query(() =>
        db.select().from(todo).where(eq(todo.id, id)).limit(FIRST_ID),
      ).pipe(Effect.flatMap(firstRow(() => TodoNotFound.make({ todoId: id }))));
      const now = yield* nowIso;
      const next: Todo = { ...current, ...change, updatedAt: now };
      yield* commit({
        entity: "todo",
        entityId: String(id),
        op,
        body: bodyOf(next),
        actor,
        at: now,
      })(
        db
          .update(todo)
          .set({ ...change, updatedAt: now })
          .where(eq(todo.id, id)),
      );
      return next;
    });

export { changeTodo, createTodo };
export type { NewTodo, TodoChange };
