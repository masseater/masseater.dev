import { Schema } from "effect";

export const MemoKey = Schema.Struct({ project: Schema.String, name: Schema.String });

const MemoEdit = Schema.Struct({
  project: Schema.String,
  name: Schema.String,
  description: Schema.NonEmptyString,
  content: Schema.NonEmptyString,
});

const MemoRetract = Schema.Struct({
  project: Schema.String,
  name: Schema.String,
  retract: Schema.Literal(true),
  reason: Schema.NonEmptyString,
});

const MemoRestore = Schema.Struct({
  project: Schema.String,
  name: Schema.String,
  restoreTo: Schema.Int,
});

export const MemoChange = Schema.Union([MemoEdit, MemoRetract, MemoRestore]);

const Revision = Schema.Struct({
  rev: Schema.Int,
  op: Schema.String,
  actor: Schema.String,
  at: Schema.Struct({ utc: Schema.String, jst: Schema.String }),
  body: Schema.Struct({
    description: Schema.optionalKey(Schema.String),
    content: Schema.optionalKey(Schema.String),
  }),
});

export const Revisions = Schema.Struct({ ref: Schema.String, revisions: Schema.Array(Revision) });

export const Written = Schema.Struct({ written: Schema.Array(Schema.String) });

export type MemoKeyValue = typeof MemoKey.Type;

export type MemoChangeValue = typeof MemoChange.Type;

export type RevisionValue = typeof Revision.Type;
