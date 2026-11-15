import { Array as Arr, Number as Num, Schema, String as Str, pipe } from "effect";

const FileSummary = Schema.Struct({
  file: Schema.String,
  bytes: Schema.Finite,
  chunks: Schema.Int,
  redactions: Schema.Finite,
});

const Session = Schema.Struct({
  kind: Schema.String,
  sessionId: Schema.String,
  cwd: Schema.String,
  source: Schema.String,
  remoteSession: Schema.String,
  firstAt: Schema.String,
  lastAt: Schema.String,
  files: Schema.Array(FileSummary),
});

const Sessions = Schema.Struct({ sessions: Schema.Array(Session) });

type SessionValue = typeof Session.Type;

const KIB = 1024;

const MIN_KB = 1;

const sizeOf = (session: SessionValue): string => {
  const bytes = pipe(
    session.files,
    Arr.map((file) => file.bytes),
    Num.sumAll,
  );
  return `${String(Math.max(MIN_KB, Math.round(bytes / KIB)))} KB`;
};

const placeOf = (session: SessionValue): string =>
  pipe(session.cwd, Str.split("/"), Arr.lastNonEmpty);

export { Sessions, placeOf, sizeOf };
export type { SessionValue };
