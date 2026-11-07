import { and, eq, like } from "drizzle-orm";
import { Array as Arr, Effect, Option, Order, pipe } from "effect";

import { StorageFailed } from "#/features/mcp/model/storage-failed";
import { TodoNotFound } from "#/features/mcp/model/todo-not-found";
import { NO_DUE_DATE, todo } from "#/features/mcp/model/todo.table";
import type { Todo, TodoPriority, TodoStatus } from "#/features/mcp/model/todo.table";
import { db } from "#/shared/db/index.server";

import { anyTermMatches, firstRow, nowIso, query, termsOf } from "./storage.server";

type NewTodo = Readonly<{
  title: string;
  note?: string;
  priority?: TodoPriority;
  dueOn?: string;
}>;

type TodoChange = Readonly<{
  id: number;
  title?: string;
  note?: string;
  status?: TodoStatus;
  priority?: TodoPriority;
  dueOn?: string;
}>;

type TodoQuery = Readonly<{ status: TodoStatus; query: string; limit: number }>;

const CANDIDATE_LIMIT = 500;

const PRIORITY_RANK: Readonly<Record<TodoPriority, number>> = { high: 0, normal: 1, low: 2 };

const byPriority = Order.mapInput(Order.Number, (row: Todo) => PRIORITY_RANK[row.priority]);

const byHavingDueDate = Order.mapInput(Order.Boolean, (row: Todo) => row.dueOn === NO_DUE_DATE);

const byDueDate = Order.mapInput(Order.String, (row: Todo) => row.dueOn);

const byId = Order.mapInput(Order.Number, (row: Todo) => row.id);

const addTodo = (input: NewTodo): Effect.Effect<Todo, StorageFailed> =>
  nowIso.pipe(
    Effect.flatMap((now) =>
      query(() =>
        db
          .insert(todo)
          .values({ ...input, createdAt: now, updatedAt: now })
          .returning(),
      ),
    ),
    Effect.flatMap(firstRow(() => StorageFailed.make({ message: "insert returned no row" }))),
  );

const updateTodo = ({
  id,
  ...change
}: TodoChange): Effect.Effect<Todo, TodoNotFound | StorageFailed> =>
  nowIso.pipe(
    Effect.flatMap((now) =>
      query(() =>
        db
          .update(todo)
          .set({ ...change, updatedAt: now })
          .where(eq(todo.id, id))
          .returning(),
      ),
    ),
    Effect.flatMap(firstRow(() => TodoNotFound.make({ todoId: id }))),
  );

const listTodos = ({
  status,
  query: text,
  limit,
}: TodoQuery): Effect.Effect<readonly Todo[], StorageFailed> => {
  const conditions = [
    eq(todo.status, status),
    ...Option.toArray(
      anyTermMatches((pattern) => [like(todo.title, pattern), like(todo.note, pattern)])(
        termsOf(text),
      ),
    ),
  ];
  return query(() =>
    db
      .select()
      .from(todo)
      .where(and(...conditions))
      .limit(CANDIDATE_LIMIT),
  ).pipe(
    Effect.map((rows) =>
      pipe(rows, Arr.sortBy(byPriority, byHavingDueDate, byDueDate, byId), Arr.take(limit)),
    ),
  );
};

export { addTodo, listTodos, updateTodo };
export type { NewTodo, TodoChange, TodoQuery };
