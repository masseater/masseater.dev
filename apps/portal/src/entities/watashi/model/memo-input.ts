import { Schema } from "effect";

const MemoKey = Schema.Struct({ project: Schema.String, name: Schema.String });

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

const MemoChange = Schema.Union([MemoEdit, MemoRetract, MemoRestore]);

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

const Revisions = Schema.Struct({ ref: Schema.String, revisions: Schema.Array(Revision) });

const Written = Schema.Struct({ written: Schema.Array(Schema.String) });

type MemoKeyValue = typeof MemoKey.Type;

type MemoChangeValue = typeof MemoChange.Type;

type RevisionValue = typeof Revision.Type;

export { MemoChange, MemoKey, Revisions, Written };
export type { MemoChangeValue, MemoKeyValue, RevisionValue };
