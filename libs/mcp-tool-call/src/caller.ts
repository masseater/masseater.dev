import { Option } from "effect";

export type Caller = Readonly<{ client: string; userAgent: string }>;

export type CallerSource = Readonly<{ request: Request; azp: unknown; clientId: unknown }>;

const UNKNOWN_CLIENT = "unknown";

export const callerOf = ({ request, azp, clientId }: CallerSource): Caller => ({
  client: Option.fromNullishOr(azp ?? clientId).pipe(
    Option.map(String),
    Option.getOrElse(() => UNKNOWN_CLIENT),
  ),
  userAgent: request.headers.get("user-agent") ?? "",
});
