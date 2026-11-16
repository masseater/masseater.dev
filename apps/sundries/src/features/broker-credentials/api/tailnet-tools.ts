import type { Caller, UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { NO_PROJECT } from "@masseater.dev/mcp-tool-call";
import type { JoinedTailnet } from "@masseater.dev/repositories/credential-broker";
import type { McpServer } from "@modelcontextprotocol/server";
import { env } from "cloudflare:workers";
import { Effect, Schema } from "effect";

import { brokerFailed, meteredInput, runTool } from "#/shared/api/index.ts";

const ONE_JOIN = 1;

const DESCRIPTION =
  "Return short-lived credentials to join the owner's tailnet and SSH to the Windows PC (ssh Host win). Run `tailscale up --client-id=<clientId> --id-token=<idToken> --advertise-tags=<tags joined with commas>`, write sshCertificate to ~/.ssh/win-cert.pub, then `ssh win`. idToken lasts 5 minutes and the certificate until expiresAt.";

const TailnetInput = Schema.Struct({
  publicKey: Schema.String.annotate({
    description: "The ssh-ed25519 line of ~/.ssh/win.pub",
  }),
});

const INPUT_SCHEMA = TailnetInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const join = (publicKey: string): Effect.Effect<JoinedTailnet, UpstreamFailed> =>
  Effect.tryPromise({ try: () => env.TAILNET.join(publicKey), catch: brokerFailed });

export const registerTailnetTools =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "join_tailnet",
      {
        description: DESCRIPTION,
        inputSchema: meteredInput({ tool: "join_tailnet", caller, project: NO_PROJECT })(
          INPUT_SCHEMA,
        ),
        annotations: { readOnlyHint: false, openWorldHint: true },
      },
      (input) =>
        join(input.publicKey).pipe(
          runTool({
            tool: "join_tailnet",
            caller,
            project: NO_PROJECT,
            input,
            count: () => ONE_JOIN,
          }),
        ),
    );
    return server;
  };
