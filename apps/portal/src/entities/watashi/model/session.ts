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

export const Sessions = Schema.Struct({ sessions: Schema.Array(Session) });

export type SessionValue = typeof Session.Type;

const KIB = 1024;

const MIN_KB = 1;

export const sizeOf = (session: SessionValue): string => {
  const bytes = pipe(
    session.files,
    Arr.map((file) => file.bytes),
    Num.sumAll,
  );
  return `${String(Math.max(MIN_KB, Math.round(bytes / KIB)))} KB`;
};

export const placeOf = (session: SessionValue): string =>
  pipe(session.cwd, Str.split("/"), Arr.lastNonEmpty);
