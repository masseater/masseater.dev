import { Record as Rec, Schema } from "effect";

import { TOKEN_SCOPES } from "#/features/mcp/model/api-token.table";
import { CONVERSATION_KINDS } from "#/features/mcp/model/conversation.table";

import type { FileKey } from "./conversation-store.server";

const NO_OFFSET = 0;
const MAX_LABEL_LENGTH = 200;

const Offset = Schema.FiniteFromString.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(NO_OFFSET),
);

const FileQuery = Schema.Struct({
  kind: Schema.Literals(CONVERSATION_KINDS),
  session: Schema.String.check(Schema.isPattern(/^[\w-]{1,128}$/u)),
  file: Schema.String.check(Schema.isPattern(/^(?:[\w-]{1,128}|subagents\/[\w.-]{1,160})$/u)),
});

const ChunkQuery = Schema.Struct({
  ...FileQuery.fields,
  start: Offset,
  end: Offset,
  redactions: Offset,
  cwd: Schema.String,
  source: Schema.String,
  remoteSession: Schema.String,
});

const Label = Schema.String.check(Schema.isMaxLength(MAX_LABEL_LENGTH));

const TokenBody = Schema.Struct({ scope: Schema.Literals(TOKEN_SCOPES), label: Label });

const TokenRequest = Schema.fromJsonString(TokenBody);

type ChunkParams = typeof ChunkQuery.Type;

type FileParams = typeof FileQuery.Type;

const paramsOf = (request: Request): Readonly<Record<string, string>> =>
  Rec.fromEntries(new URL(request.url).searchParams.entries());

const fileKeyOf = ({ kind, session, file }: FileParams): FileKey => ({
  kind,
  sessionId: session,
  file,
});

type TokenFields = typeof TokenBody.Type;

export { ChunkQuery, FileQuery, Label, TokenRequest, fileKeyOf, paramsOf };
export type { ChunkParams, FileParams, TokenFields };
