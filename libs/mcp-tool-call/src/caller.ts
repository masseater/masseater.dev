import { Option } from "effect";

type Caller = Readonly<{ client: string; userAgent: string }>;

type CallerSource = Readonly<{ request: Request; azp: unknown; clientId: unknown }>;

const UNKNOWN_CLIENT = "unknown";

const callerOf = ({ request, azp, clientId }: CallerSource): Caller => ({
  client: Option.fromNullishOr(azp ?? clientId).pipe(
    Option.map(String),
    Option.getOrElse(() => UNKNOWN_CLIENT),
  ),
  userAgent: request.headers.get("user-agent") ?? "",
});

export { callerOf };
export type { Caller, CallerSource };
