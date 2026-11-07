import { Schema } from "effect";

import { NO_DUE_DATE, TODO_PRIORITIES, TODO_STATUSES } from "#/features/mcp/model/todo.table";

const DEFAULT_TODO_LIMIT = 50;
const MAX_TODO_LIMIT = 200;
const MIN_TODO_LIMIT = 1;

const Id = Schema.Int.annotate({ description: "todo_add や todo_list が返す ToDo の id" });
const Title = Schema.NonEmptyString.annotate({ description: "やることを一行で" });
const Note = Schema.String.annotate({ description: "補足やリンク（Markdown）" });
const Status = Schema.Literals(TODO_STATUSES).annotate({
  description: "open は未着手か作業中、done は終わった、canceled はやめた",
});
const Priority = Schema.Literals(TODO_PRIORITIES).annotate({ description: "既定は normal" });
const DueDate = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/u)).annotate({
  description: "期限の日付（YYYY-MM-DD）",
});
const DueDateOrNone = Schema.Union([DueDate, Schema.Literal(NO_DUE_DATE)]).annotate({
  description: "期限の日付（YYYY-MM-DD）。空文字で期限を外す",
});
const LimitRange = Schema.isBetween({ minimum: MIN_TODO_LIMIT, maximum: MAX_TODO_LIMIT });
const Limit = Schema.Int.check(LimitRange).annotate({
  description: `返す件数。既定は ${DEFAULT_TODO_LIMIT}`,
});

const TodoAddInput = Schema.Struct({
  title: Title,
  note: Schema.optionalKey(Note),
  priority: Schema.optionalKey(Priority),
  dueOn: Schema.optionalKey(DueDate),
});

const TodoUpdateInput = Schema.Struct({
  id: Id,
  title: Schema.optionalKey(Title),
  note: Schema.optionalKey(Note),
  status: Schema.optionalKey(Status),
  priority: Schema.optionalKey(Priority),
  dueOn: Schema.optionalKey(DueDateOrNone),
});

const TodoListInput = Schema.Struct({
  status: Schema.optionalKey(Status.annotate({ description: "絞り込む状態。既定は open" })),
  query: Schema.optionalKey(
    Schema.String.annotate({
      description: "空白で区切った語。どれかを題名かメモに部分一致で含む ToDo だけを返す",
    }),
  ),
  limit: Schema.optionalKey(Limit),
});

export { DEFAULT_TODO_LIMIT, TodoAddInput, TodoListInput, TodoUpdateInput };
