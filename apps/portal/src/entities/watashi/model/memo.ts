import { Schema } from "effect";

import { TimeOut } from "#/shared/model/index.ts";

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

export const MemoList = Schema.Struct({ total: Schema.Int, items: Schema.Array(Memo) });

export const MemoProjects = Schema.Struct({
  projects: Schema.Array(
    Schema.Struct({ project: Schema.String, memos: Schema.Int, updatedAt: TimeOut }),
  ),
});

export type MemoValue = typeof Memo.Type;

export type ProjectValue = (typeof MemoProjects.Type)["projects"][number];
