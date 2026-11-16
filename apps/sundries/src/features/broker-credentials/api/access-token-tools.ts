import type { Caller, UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { NO_PROJECT } from "@masseater.dev/mcp-tool-call";
import type { AccessSite } from "@masseater.dev/repositories/access-sites";
import type { SiteToken } from "@masseater.dev/repositories/credential-broker";
import type { McpServer } from "@modelcontextprotocol/server";
import { env } from "cloudflare:workers";
import { Effect, Match, Schema } from "effect";

import { brokerFailed, meteredInput, runTool } from "#/shared/api/index.ts";

import { AccessTokenInput } from "./access-token-input.ts";

const ONE_TOKEN = 1;

const DESCRIPTION =
  "Return an OAuth access token for one of the owner's sites behind Cloudflare Access, issued through the owner's Google login. Send it as Authorization: Bearer and call again after expiresAt. When status is login, ask the owner to open loginUrl.";

const INPUT_SCHEMA = AccessTokenInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
);

type IssuedToken = Exclude<SiteToken, Readonly<{ status: "failed" }>>;

const issued = (token: SiteToken): Effect.Effect<IssuedToken, UpstreamFailed> =>
  Match.value(token).pipe(
    Match.discriminator("status")("failed", ({ message }) =>
      Effect.fail(brokerFailed(new Error(message))),
    ),
    Match.orElse((rest) => Effect.succeed(rest)),
  );

const siteToken = (site: AccessSite): Effect.Effect<IssuedToken, UpstreamFailed> =>
  Effect.tryPromise({
    try: (): Promise<SiteToken> => env.ACCESS_OAUTH.token(site),
    catch: brokerFailed,
  }).pipe(Effect.flatMap(issued));

export const registerAccessTokenTools =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "get_access_token",
      {
        description: DESCRIPTION,
        inputSchema: meteredInput({ tool: "get_access_token", caller, project: NO_PROJECT })(
          INPUT_SCHEMA,
        ),
        annotations: { readOnlyHint: true, openWorldHint: true },
      },
      (input) =>
        siteToken(input.site).pipe(
          runTool({
            tool: "get_access_token",
            caller,
            project: NO_PROJECT,
            input,
            count: () => ONE_TOKEN,
          }),
        ),
    );
    return server;
  };
