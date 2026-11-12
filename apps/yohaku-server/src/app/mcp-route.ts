import { MCP_PATH } from "@masseater.dev/yohaku-protocol";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { Array, Effect, Layer, Option, Redacted, String, pipe } from "effect";
import { Mac } from "effect/crypto";
import { HttpEffect, HttpRouter, HttpServerResponse } from "effect/http";
import type { HttpServerRequest } from "effect/http";

import { McpToken } from "./mcp-token.ts";
import { toolServers } from "./mcp-tools.ts";

const BEARER = "Bearer ";
const UNAUTHORIZED = 401;
const CLAUDE_CODE = /claude-code/iu;
const PRODUCT = /^[^/\s]+/u;
const UNKNOWN_CLIENT = "MCP";

const encoder = new TextEncoder();

const headerOf = (request: HttpServerRequest.HttpServerRequest, name: string): string =>
  pipe(
    Option.fromUndefinedOr(request.headers[name]),
    Option.getOrElse(() => String.empty),
  );

const clientOf = (request: HttpServerRequest.HttpServerRequest): string => {
  const agent = headerOf(request, "user-agent");
  if (CLAUDE_CODE.test(agent)) {
    return "Claude Code";
  }
  return pipe(
    agent,
    String.match(PRODUCT),
    Option.flatMap(Array.head),
    Option.getOrElse(() => UNKNOWN_CLIENT),
  );
};

const presented = (request: HttpServerRequest.HttpServerRequest, expected: string): boolean =>
  pipe(
    Option.some(headerOf(request, "authorization")),
    Option.filter(String.startsWith(BEARER)),
    Option.map(String.slice(BEARER.length)),
    Option.exists((given) => Mac.timingSafeEqual(encoder.encode(given), encoder.encode(expected))),
  );

/** @internal */
const mcpRoute = Layer.unwrap(
  Effect.gen(function* mcpRoute() {
    const token = yield* McpToken;
    const serverFor = yield* toolServers;
    return HttpRouter.add("*", MCP_PATH, (request) => {
      if (!presented(request, Redacted.value(token))) {
        return Effect.succeed(HttpServerResponse.empty({ status: UNAUTHORIZED }));
      }
      const client = clientOf(request);
      return HttpEffect.fromWebHandler((web) =>
        createMcpHandler(() => serverFor(client)).fetch(web),
      );
    });
  }),
);

export { mcpRoute };
