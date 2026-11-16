import { CONVERSATION_KINDS } from "@masseater.dev/watashi-protocol";
import { Schema } from "effect";

import type { ConversationKind } from "#/shared/db/index.ts";

const DEFAULT_SESSION_LIMIT = 20;
const MAX_SESSION_LIMIT = 100;
const MIN_SESSION_LIMIT = 1;
const DEFAULT_MAX_BYTES = 200_000;
const MIN_MAX_BYTES = 1000;
const MAX_MAX_BYTES = 2_000_000;
const FIRST_OFFSET = 0;

const Kind = Schema.Literals(CONVERSATION_KINDS).annotate({
  description: "Default claude-code",
});

const SessionId = Schema.String.annotate({
  description: "Omit to list recent sessions",
});

const File = Schema.String.annotate({
  description: "Default: the main transcript. Subagents: subagents/agent-<id>",
});

const NonNegative = Schema.isGreaterThanOrEqualTo(FIRST_OFFSET);

const Cursor = Schema.Int.check(NonNegative).annotate({
  description: "nextCursor from the previous call",
});

const ByteRange = Schema.isBetween({ minimum: MIN_MAX_BYTES, maximum: MAX_MAX_BYTES });

const MaxBytes = Schema.Int.check(ByteRange).annotate({
  description: `Default ${DEFAULT_MAX_BYTES}`,
});

const SessionRange = Schema.isBetween({ minimum: MIN_SESSION_LIMIT, maximum: MAX_SESSION_LIMIT });

const Limit = Schema.Int.check(SessionRange).annotate({
  description: `Default ${DEFAULT_SESSION_LIMIT}`,
});

const VIEWS = ["raw", "owner"] as const;

const ViewSchema = Schema.Literals(VIEWS).annotate({
  description: "raw (default): the JSONL as text. owner: only the owner's utterances",
});

export const ReadInput = Schema.Struct({
  kind: Schema.optionalKey(Kind),
  sessionId: Schema.optionalKey(SessionId),
  file: Schema.optionalKey(File),
  cursor: Schema.optionalKey(Cursor),
  maxBytes: Schema.optionalKey(MaxBytes),
  limit: Schema.optionalKey(Limit),
  view: Schema.optionalKey(ViewSchema),
});

export type Input = typeof ReadInput.Type;

export type ReadRequest = Readonly<{
  kind: ConversationKind;
  sessionId: string;
  file: string;
  cursor: number;
  maxBytes: number;
  view: View;
}>;

export type View = typeof ViewSchema.Type;

export type ListRequest = Readonly<{ kind: ConversationKind; limit: number }>;

const DEFAULT_KIND: ConversationKind = "claude-code";

export const listRequestOf = (input: Input): ListRequest => ({
  kind: input.kind ?? DEFAULT_KIND,
  limit: input.limit ?? DEFAULT_SESSION_LIMIT,
});

export const readRequestOf = (
  request: Readonly<{ input: Input; sessionId: string }>,
): ReadRequest => ({
  kind: request.input.kind ?? DEFAULT_KIND,
  sessionId: request.sessionId,
  file: request.input.file ?? request.sessionId,
  cursor: request.input.cursor ?? FIRST_OFFSET,
  maxBytes: request.input.maxBytes ?? DEFAULT_MAX_BYTES,
  view: request.input.view ?? "raw",
});
