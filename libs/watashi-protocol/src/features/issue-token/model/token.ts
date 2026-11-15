import { Schema } from "effect";

export const TOKENS_PATH = "/api/tokens";

export const TOKEN_SCOPES = ["conversation:write", "memory:write"] as const;

export const API_TOKEN_PREFIX = "wat_";

export const API_TOKEN_BYTES = 32;

const MAX_LABEL_LENGTH = 200;

const Scope = Schema.Literals(TOKEN_SCOPES);

export const Label = Schema.String.check(Schema.isMaxLength(MAX_LABEL_LENGTH));

export const TokenBody = Schema.Struct({ scope: Scope, label: Label });

export const TokenRequest = Schema.fromJsonString(TokenBody);

export const IssuedToken = Schema.Struct({
  id: Schema.String,
  token: Schema.String,
  scope: Scope,
  label: Schema.String,
});

export const TokenSummary = Schema.Struct({
  id: Schema.String,
  scope: Scope,
  label: Schema.String,
  createdAt: Schema.String,
  revokedAt: Schema.NullOr(Schema.String),
});

export const TokenList = Schema.Struct({ tokens: Schema.Array(TokenSummary) });

export const Revoked = Schema.Struct({ revoked: Schema.String });

export type TokenScope = typeof Scope.Type;

export type TokenFields = typeof TokenBody.Type;
