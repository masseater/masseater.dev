import type { AuthInfo } from "@modelcontextprotocol/server";
import { Option, pipe } from "effect";

export type CallerClaims = Readonly<Record<string, unknown>>;

export type CallContext = Readonly<{
  http?: Readonly<{ authInfo?: Readonly<{ clientId: string }> | undefined }> | undefined;
}>;

const UNKNOWN_CLIENT = "unknown";

const NO_TOKEN = "";

export const authInfoOf = (claims: CallerClaims): AuthInfo => ({
  token: NO_TOKEN,
  clientId: Option.fromNullishOr(claims["azp"] ?? claims["client_id"]).pipe(
    Option.map(String),
    Option.getOrElse(() => UNKNOWN_CLIENT),
  ),
  scopes: [],
});

export const clientOf = (ctx: CallContext): string =>
  pipe(
    Option.fromNullishOr(ctx.http),
    Option.flatMap(({ authInfo }) => Option.fromNullishOr(authInfo)),
    Option.map(({ clientId }) => clientId),
    Option.getOrElse(() => UNKNOWN_CLIENT),
  );
