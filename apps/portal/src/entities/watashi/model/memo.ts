import { Schema } from "effect";

import { TimeOut } from "#/shared/model";

const Memo = Schema.Struct({
  ref: Schema.String,
  project: Schema.String,
  name: Schema.String,
  description: Schema.String,
  content: Schema.String,
  evidence: Schema.Array(Schema.String),
  updatedAt: TimeOut,
  retracted: Schema.optionalKey(Schema.Struct({ at: Schema.String, reason: Schema.String })),
});

const MemoList = Schema.Struct({ total: Schema.Int, items: Schema.Array(Memo) });

const MemoProjects = Schema.Struct({
  projects: Schema.Array(
    Schema.Struct({ project: Schema.String, memos: Schema.Int, updatedAt: TimeOut }),
  ),
});

type MemoValue = typeof Memo.Type;

type ProjectValue = (typeof MemoProjects.Type)["projects"][number];

export { Memo, MemoList, MemoProjects };
export type { MemoValue, ProjectValue };
