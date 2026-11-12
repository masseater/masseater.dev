import { HOST } from "@masseater.dev/local-server";
import { MCP_PATH } from "@masseater.dev/yohaku-protocol";
import { Context, Effect, Layer, Match, Option, Redacted } from "effect";
import { HttpServer } from "effect/http";
import type { NetAddress } from "effect/net";

import { McpToken } from "./mcp-token.ts";

class McpEndpoint extends Context.Service<
  McpEndpoint,
  { readonly url: string; readonly token: string }
>()("yohaku-server/app/mcp-endpoint/McpEndpoint") {}

const portOf = Match.type<NetAddress.SocketAddress>().pipe(
  Match.tag("UnixPathAddress", () => Option.none<number>()),
  Match.orElse(({ port }) => Option.some(port)),
);

/** @internal */
const mcpEndpointLayer = Layer.effect(
  McpEndpoint,
  Effect.gen(function* endpoint() {
    const { address } = yield* HttpServer.HttpServer;
    const token = yield* McpToken;
    const port = yield* Effect.fromOption(portOf(address));
    return {
      url: `http://${HOST}:${globalThis.String(port)}${MCP_PATH}`,
      token: Redacted.value(token),
    };
  }),
);

export { McpEndpoint, mcpEndpointLayer };
