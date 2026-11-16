import { Schema } from "effect";

export const CONVERSATIONS_PATH = "/api/conversations";

export const CONVERSATION_KINDS = ["claude-code"] as const;

export const CONVERSATION_SOURCES = ["claude-code-local", "claude-code-cloud"] as const;

const NO_OFFSET = 0;

const Offset = Schema.FiniteFromString.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(NO_OFFSET),
);

const Kind = Schema.Literals(CONVERSATION_KINDS);

export const FileQuery = Schema.Struct({
  kind: Kind,
  session: Schema.String.check(Schema.isPattern(/^[\w-]{1,128}$/u)),
  file: Schema.String.check(Schema.isPattern(/^(?:[\w-]{1,128}|subagents\/[\w.-]{1,160})$/u)),
});

export const ChunkQuery = Schema.Struct({
  ...FileQuery.fields,
  start: Offset,
  end: Offset,
  redactions: Offset,
  cwd: Schema.String,
  source: Schema.Literals(CONVERSATION_SOURCES),
  remoteSession: Schema.String,
});

export const Committed = Schema.Struct({ committed: Schema.Int });

export const Conflict = Schema.Struct({ expected: Schema.Int });

export type ConversationKind = typeof Kind.Type;

export type ConversationSource = (typeof CONVERSATION_SOURCES)[number];

export type FileParams = typeof FileQuery.Type;

export type ChunkParams = typeof ChunkQuery.Type;
