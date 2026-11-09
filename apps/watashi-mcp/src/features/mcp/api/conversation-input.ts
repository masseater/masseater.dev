import { Schema } from "effect";

import { CONVERSATION_KINDS } from "#/features/mcp/model/conversation.table";
import type { ConversationKind } from "#/features/mcp/model/conversation.table";

const DEFAULT_SESSION_LIMIT = 20;
const MAX_SESSION_LIMIT = 100;
const MIN_SESSION_LIMIT = 1;
const DEFAULT_MAX_BYTES = 200_000;
const MIN_MAX_BYTES = 1000;
const MAX_MAX_BYTES = 2_000_000;
const FIRST_OFFSET = 0;

const Kind = Schema.Literals(CONVERSATION_KINDS).annotate({
  description: "会話をしたツール。今は claude-code だけ。既定は claude-code",
});

const SessionId = Schema.String.annotate({
  description:
    "読む会話のセッション ID。省くと最近の会話の一覧（作業ディレクトリ・期間・ファイルごとのバイト数）を返す",
});

const File = Schema.String.annotate({
  description:
    "セッションの中のファイル。本体はセッション ID と同じ名前、subagent は subagents/agent-<id>。既定は本体",
});

const NonNegative = Schema.isGreaterThanOrEqualTo(FIRST_OFFSET);

const Cursor = Schema.Int.check(NonNegative).annotate({
  description: "読み始めるバイト位置。前の呼び出しの nextCursor を渡す。既定は 0",
});

const ByteRange = Schema.isBetween({ minimum: MIN_MAX_BYTES, maximum: MAX_MAX_BYTES });

const MaxBytes = Schema.Int.check(ByteRange).annotate({
  description: `一度に返す本文のおおよその上限（バイト）。既定は ${DEFAULT_MAX_BYTES}`,
});

const SessionRange = Schema.isBetween({ minimum: MIN_SESSION_LIMIT, maximum: MAX_SESSION_LIMIT });

const Limit = Schema.Int.check(SessionRange).annotate({
  description: `一覧で返す会話の数。既定は ${DEFAULT_SESSION_LIMIT}`,
});

const VIEWS = ["raw", "owner"] as const;

const ViewSchema = Schema.Literals(VIEWS).annotate({
  description:
    "raw はトランスクリプトの JSONL を text にそのまま返す。owner は持ち主の発言だけを {uuid, timestamp, text} の並びにして utterances に返す。既定は raw",
});

const ReadInput = Schema.Struct({
  kind: Schema.optionalKey(Kind),
  sessionId: Schema.optionalKey(SessionId),
  file: Schema.optionalKey(File),
  cursor: Schema.optionalKey(Cursor),
  maxBytes: Schema.optionalKey(MaxBytes),
  limit: Schema.optionalKey(Limit),
  view: Schema.optionalKey(ViewSchema),
});

type Input = typeof ReadInput.Type;

type ReadRequest = Readonly<{
  kind: ConversationKind;
  sessionId: string;
  file: string;
  cursor: number;
  maxBytes: number;
  view: View;
}>;

type View = typeof ViewSchema.Type;

type ListRequest = Readonly<{ kind: ConversationKind; limit: number }>;

const DEFAULT_KIND: ConversationKind = "claude-code";

const listRequestOf = (input: Input): ListRequest => ({
  kind: input.kind ?? DEFAULT_KIND,
  limit: input.limit ?? DEFAULT_SESSION_LIMIT,
});

const readRequestOf = (request: Readonly<{ input: Input; sessionId: string }>): ReadRequest => ({
  kind: request.input.kind ?? DEFAULT_KIND,
  sessionId: request.sessionId,
  file: request.input.file ?? request.sessionId,
  cursor: request.input.cursor ?? FIRST_OFFSET,
  maxBytes: request.input.maxBytes ?? DEFAULT_MAX_BYTES,
  view: request.input.view ?? "raw",
});

export { ReadInput, listRequestOf, readRequestOf };
export type { Input, ListRequest, ReadRequest, View };
