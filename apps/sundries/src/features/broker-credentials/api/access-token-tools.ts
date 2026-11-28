import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { toolInputOf } from "@masseater.dev/mcp-tool-call";
import type { AccessSite } from "@masseater.dev/repositories/access-sites";
import type { SiteToken } from "@masseater.dev/repositories/credential-broker";
import type { McpServer } from "@modelcontextprotocol/server";
import { Effect, Match } from "effect";

import { brokerFailed, runTool } from "#/shared/api/index.ts";

import { AccessTokenInput } from "./access-token-input.ts";

const ONE_TOKEN = 1;

const DESCRIPTION =
  "Return an OAuth access token for one of the owner's sites behind Cloudflare Access.";

const INPUT_SCHEMA = toolInputOf(AccessTokenInput);

type IssuedToken = Exclude<SiteToken, Readonly<{ status: "failed" }>>;

const issued = (token: SiteToken): Effect.Effect<IssuedToken, UpstreamFailed> =>
  Match.value(token).pipe(
    Match.discriminator("status")("failed", ({ message }) =>
      Effect.fail(brokerFailed(new Error(message))),
    ),
    Match.orElse((rest) => Effect.succeed(rest)),
  );

export type AccessTokens = Readonly<{ token: (site: AccessSite) => Promise<SiteToken> }>;

const siteToken =
  (tokens: AccessTokens) =>
  (site: AccessSite): Effect.Effect<IssuedToken, UpstreamFailed> =>
    Effect.tryPromise({
      try: (): Promise<SiteToken> => tokens.token(site),
      catch: brokerFailed,
    }).pipe(Effect.flatMap(issued));

export const registerAccessTokenTools =
  (tokens: AccessTokens) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "get_access_token",
      {
        description: DESCRIPTION,
        inputSchema: INPUT_SCHEMA,
        annotations: { readOnlyHint: true, openWorldHint: true },
      },
      (input) => siteToken(tokens)(input.site).pipe(runTool({ count: () => ONE_TOKEN })),
    );
    return server;
  };
