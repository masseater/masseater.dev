import type { AuthInfo } from "@modelcontextprotocol/server";
import { Option } from "effect";

export type CallerClaims = Readonly<{ azp: unknown; clientId: unknown }>;

const UNKNOWN_CLIENT = "unknown";

const NO_TOKEN = "";

export const authInfoOf = ({ azp, clientId }: CallerClaims): AuthInfo => ({
  token: NO_TOKEN,
  clientId: Option.fromNullishOr(azp ?? clientId).pipe(
    Option.map(String),
    Option.getOrElse(() => UNKNOWN_CLIENT),
  ),
  scopes: [],
});

export type CallContext = Readonly<{ http?: Readonly<{ authInfo?: AuthInfo }> | undefined }>;

export const clientOf = (ctx: CallContext): string =>
  ctx.http?.authInfo?.clientId ?? UNKNOWN_CLIENT;
