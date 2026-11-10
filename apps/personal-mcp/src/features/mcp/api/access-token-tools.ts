import type { Caller, UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { failedAt, NO_PROJECT } from "@masseater.dev/mcp-tool-call";
import type { AccessSite } from "@masseater.dev/repositories/access-sites";
import type { McpServer } from "@modelcontextprotocol/server";
import { env } from "cloudflare:workers";
import { Effect, Schema } from "effect";

import { AccessTokenInput, SiteToken } from "./access-token-input";
import { meteredInput, runTool } from "./tool-call";

const TOKEN_URL = "https://credentials.masseater.dev/access-oauth/token";
const ONE_TOKEN = 1;

const DESCRIPTION =
  "Cloudflare Access の背後にある持ち主のサイトを開くための OAuth のアクセストークンを返す。トークンは Access の Managed OAuth が、持ち主と同じ Google のログインを通して出したもので、リクエストに Authorization: Bearer <accessToken> を付けて使う。期限は expiresAt で、切れたらもう一度呼ぶ。status が login のときは、持ち主に loginUrl を開いて Google でログインしてもらう。";

const INPUT_SCHEMA = AccessTokenInput.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
);

const fail = failedAt("credential broker");

const siteToken = (site: AccessSite): Effect.Effect<typeof SiteToken.Type, UpstreamFailed> =>
  Effect.tryPromise({
    try: () => env.ACCESS_OAUTH.fetch(`${TOKEN_URL}?site=${site}`),
    catch: fail,
  }).pipe(
    Effect.filterOrFail(
      (response) => response.ok,
      (response) => fail(new Error(`HTTP ${String(response.status)}`)),
    ),
    Effect.flatMap((response) => Effect.tryPromise({ try: () => response.json(), catch: fail })),
    Effect.flatMap((body) =>
      Schema.decodeUnknownEffect(SiteToken)(body).pipe(Effect.mapError(fail)),
    ),
  );

const registerAccessTokenTools =
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

export { registerAccessTokenTools };
