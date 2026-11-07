import { and, eq, like } from "drizzle-orm";
import { Array as Arr, Effect, Option, Order, pipe } from "effect";

import type { StorageFailed } from "#/features/mcp/model/storage-failed";
import { NO_DUE_DATE, todo } from "#/features/mcp/model/todo.table";
import type { Todo, TodoPriority, TodoStatus } from "#/features/mcp/model/todo.table";
import { db } from "#/shared/db/index.server";

import { anyTermMatches, query, termsOf } from "./storage.server";

type TodoQuery = Readonly<{ status: TodoStatus; query: string; limit: number }>;

const CANDIDATE_LIMIT = 500;

const PRIORITY_RANK: Readonly<Record<TodoPriority, number>> = { high: 0, normal: 1, low: 2 };

const byPriority = Order.mapInput(Order.Number, (row: Todo) => PRIORITY_RANK[row.priority]);

const byHavingDueDate = Order.mapInput(Order.Boolean, (row: Todo) => row.dueOn === NO_DUE_DATE);

const byDueDate = Order.mapInput(Order.String, (row: Todo) => row.dueOn);

const byId = Order.mapInput(Order.Number, (row: Todo) => row.id);

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

export { listTodos };
export type { TodoQuery };
