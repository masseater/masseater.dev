import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const TODO_STATUSES = ["open", "done", "canceled"] as const;

const TODO_PRIORITIES = ["high", "normal", "low"] as const;

const NO_DUE_DATE = "";

const todo = sqliteTable(
  "todo",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    note: text("note").notNull().default(""),
    status: text("status", { enum: TODO_STATUSES }).notNull().default("open"),
    priority: text("priority", { enum: TODO_PRIORITIES }).notNull().default("normal"),
    dueOn: text("due_on").notNull().default(NO_DUE_DATE),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("todo_status_idx").on(table.status)],
);

type Todo = typeof todo.$inferSelect;

type TodoStatus = Todo["status"];

type TodoPriority = Todo["priority"];

export { NO_DUE_DATE, TODO_PRIORITIES, TODO_STATUSES, todo };
export type { Todo, TodoPriority, TodoStatus };
