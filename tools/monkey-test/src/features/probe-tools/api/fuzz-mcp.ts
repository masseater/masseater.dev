import { Array as Arr, Console, Duration, Effect, Option, Record as Rec, pipe } from "effect";

import type { Finding } from "#/entities/finding/index.ts";
import { connectMcp } from "#/features/probe-tools/api/connect-mcp.ts";
import { findMcpHosts } from "#/features/probe-tools/api/find-mcp-hosts.ts";
import { fuzzClient } from "#/features/probe-tools/api/fuzz-client.ts";

const CALL_TIMEOUT_SECONDS = 30;

const fuzzedHost = (
  input: Readonly<{ host: string; token: string; seed: number }>,
): Effect.Effect<readonly Finding[]> =>
  Effect.scoped(
    connectMcp(input).pipe(
      Effect.flatMap((client) =>
        fuzzClient({
          client,
          host: input.host,
          seed: input.seed,
          timeout: Duration.seconds(CALL_TIMEOUT_SECONDS),
        }),
      ),
      Effect.orElseSucceed((): readonly Finding[] => []),
    ),
  );

const fuzzedOrSkipped = Effect.fn("monkey.mcp.host")(function* fuzzedOrSkipped(
  input: Readonly<{ host: string; token: Option.Option<string>; seed: number }>,
) {
  return yield* Option.match(input.token, {
    onNone: () =>
      Console.log(`monkey.skip mcp ${input.host} no access token`).pipe(
        Effect.as<readonly Finding[]>([]),
      ),
    onSome: (token) => fuzzedHost({ host: input.host, token, seed: input.seed }),
  });
});

const fuzzedAll = Effect.fn("monkey.mcp")(function* fuzzedAll(
  input: Readonly<{
    domains: readonly string[];
    tokens: Readonly<Record<string, string>>;
    seed: number;
  }>,
) {
  const hosts = yield* findMcpHosts(input.domains);
  const found = yield* Effect.forEach(
    hosts,
    (host) => fuzzedOrSkipped({ host, token: Rec.get(input.tokens, host), seed: input.seed }),
    { concurrency: 1 },
  );
  return pipe(found, Arr.flatten);
});

/** @internal */
export const fuzzMcp = fuzzedAll;
