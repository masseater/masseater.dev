import { Effect, Option, pipe } from "effect";
import { HttpClient } from "effect/http";

import { isMcpEndpoint } from "#/features/fuzz-mcp/model/mcp-endpoint.ts";
import { keepAnsweringHosts } from "#/shared/lib/keep-answering-hosts.ts";

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
  return yield* keepAnsweringHosts({ hostnames, probe: probed });
});

/** @internal */
export const findMcpHosts = found;
