import { Schema } from "effect";

const TOKENS_PATH = "/api/tokens";

const TOKEN_SCOPES = ["conversation:write", "memory:write"] as const;

const API_TOKEN_PREFIX = "wat_";

const API_TOKEN_BYTES = 32;

const MAX_LABEL_LENGTH = 200;

const Scope = Schema.Literals(TOKEN_SCOPES);

const Label = Schema.String.check(Schema.isMaxLength(MAX_LABEL_LENGTH));

const TokenBody = Schema.Struct({ scope: Scope, label: Label });

const TokenRequest = Schema.fromJsonString(TokenBody);

const IssuedToken = Schema.Struct({
  id: Schema.String,
  token: Schema.String,
  scope: Scope,
  label: Schema.String,
});

const TokenSummary = Schema.Struct({
  id: Schema.String,
  scope: Scope,
  label: Schema.String,
  createdAt: Schema.String,
  revokedAt: Schema.NullOr(Schema.String),
});

const TokenList = Schema.Struct({ tokens: Schema.Array(TokenSummary) });

const Revoked = Schema.Struct({ revoked: Schema.String });

type TokenScope = typeof Scope.Type;

type TokenFields = typeof TokenBody.Type;

export {
  API_TOKEN_BYTES,
  API_TOKEN_PREFIX,
  IssuedToken,
  Label,
  Revoked,
  TOKENS_PATH,
  TOKEN_SCOPES,
  TokenBody,
  TokenList,
  TokenRequest,
  TokenSummary,
};
export type { TokenFields, TokenScope };
