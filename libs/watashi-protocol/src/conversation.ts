import { Schema } from "effect";

const CONVERSATIONS_PATH = "/api/conversations";

const CONVERSATION_KINDS = ["claude-code"] as const;

const CONVERSATION_SOURCES = ["claude-code-local", "claude-code-cloud"] as const;

const NO_OFFSET = 0;

const Offset = Schema.FiniteFromString.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(NO_OFFSET),
);

const Kind = Schema.Literals(CONVERSATION_KINDS);

const FileQuery = Schema.Struct({
  kind: Kind,
  session: Schema.String.check(Schema.isPattern(/^[\w-]{1,128}$/u)),
  file: Schema.String.check(Schema.isPattern(/^(?:[\w-]{1,128}|subagents\/[\w.-]{1,160})$/u)),
});

const ChunkQuery = Schema.Struct({
  ...FileQuery.fields,
  start: Offset,
  end: Offset,
  redactions: Offset,
  cwd: Schema.String,
  source: Schema.Literals(CONVERSATION_SOURCES),
  remoteSession: Schema.String,
});

const Committed = Schema.Struct({ committed: Schema.Int });

const Conflict = Schema.Struct({ expected: Schema.Int });

type ConversationKind = typeof Kind.Type;

type ConversationSource = (typeof CONVERSATION_SOURCES)[number];

type FileParams = typeof FileQuery.Type;

type ChunkParams = typeof ChunkQuery.Type;

export {
  CONVERSATIONS_PATH,
  CONVERSATION_KINDS,
  CONVERSATION_SOURCES,
  ChunkQuery,
  Committed,
  Conflict,
  FileQuery,
};
export type { ChunkParams, ConversationKind, ConversationSource, FileParams };
