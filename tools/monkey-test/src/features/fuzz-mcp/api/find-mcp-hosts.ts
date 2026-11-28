import { Array as Arr, Effect, Option, Order, pipe } from "effect";
import { HttpClient } from "effect/http";

import { isMcpEndpoint } from "#/features/fuzz-mcp/model/mcp-endpoint.ts";

const CONCURRENCY = 8;
const MCP_PATH = "/mcp";

const probed = Effect.fn("monkey.mcp.probe")(function* probed(hostname: string) {
  const client = yield* HttpClient.HttpClient;
  const response = yield* client.post(`https://${hostname}${MCP_PATH}`).pipe(Effect.option);
  return pipe(
    response,
    Option.filter((answer) =>
      isMcpEndpoint({
        status: answer.status,
        challenge: answer.headers["www-authenticate"] ?? "",
      }),
    ),
    Option.map(() => hostname),
  );
});

const found = Effect.fn("monkey.mcp.hosts")(function* found(hostnames: readonly string[]) {
  const probes = yield* Effect.forEach(hostnames, probed, { concurrency: CONCURRENCY });
  return pipe(
    probes,
    Arr.flatMap((probe) => Option.toArray(probe)),
    Arr.sortWith((name) => name, Order.String),
  );
});

/** @internal */
export const findMcpHosts = found;
