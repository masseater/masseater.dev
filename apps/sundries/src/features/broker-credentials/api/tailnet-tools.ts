import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { toolInputOf, registeredTool } from "@masseater.dev/mcp-tool-call";
import type { JoinedTailnet } from "@masseater.dev/repositories/credential-broker";
import type { McpServer } from "@modelcontextprotocol/server";
import { Effect, Schema } from "effect";

import { brokerFailed, runTool } from "#/shared/api/index.ts";

const ONE_JOIN = 1;

const DESCRIPTION =
  "Return short-lived credentials to SSH into the owner's Windows PC over the tailnet.";

const TailnetInput = Schema.Struct({
  publicKey: Schema.String.annotate({
    description:
      "The ssh-ed25519 line of ~/.ssh/win.pub. Then run tailscale up --client-id=<clientId> --id-token=<idToken> --advertise-tags=<tags joined with commas>, write sshCertificate to ~/.ssh/win-cert.pub and ssh win. idToken lasts 5 minutes",
  }),
});

const INPUT_SCHEMA = toolInputOf(TailnetInput);

export type Tailnet = Readonly<{ join: (publicKey: string) => Promise<JoinedTailnet> }>;

const join =
  (tailnet: Tailnet) =>
  (publicKey: string): Effect.Effect<JoinedTailnet, UpstreamFailed> =>
    Effect.tryPromise({ try: () => tailnet.join(publicKey), catch: brokerFailed });

export const registerTailnetTools = (tailnet: Tailnet): ((server: McpServer) => McpServer) =>
  registeredTool(
    {
      name: "join_tailnet",
      description: DESCRIPTION,
      inputSchema: INPUT_SCHEMA,
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    (input) => join(tailnet)(input.publicKey).pipe(runTool({ count: () => ONE_JOIN })),
  );
