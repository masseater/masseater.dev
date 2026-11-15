import type { Caller, UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { NO_PROJECT } from "@masseater.dev/mcp-tool-call";
import type { JoinedTailnet } from "@masseater.dev/repositories/credential-broker.worker";
import type { McpServer } from "@modelcontextprotocol/server";
import { env } from "cloudflare:workers";
import { Effect, Schema } from "effect";

import { brokerFailed, meteredInput, runTool } from "#/shared/api";

const ONE_JOIN = 1;

const DESCRIPTION =
  "持ち主の tailnet に入り、Windows の PC（ssh の Host win）へ SSH するための短命な資格を返す。publicKey に ~/.ssh/win.pub（ssh-ed25519）の中身を渡す。返った値で `tailscale up --client-id=<clientId> --id-token=<idToken> --advertise-tags=<tags をカンマでつないだもの>` を実行し、sshCertificate を ~/.ssh/win-cert.pub に書くと `ssh win` で入れる。idToken は 5 分、証明書は expiresAt まで使え、切れたらもう一度呼ぶ。";

const TailnetInput = Schema.Struct({
  publicKey: Schema.String.annotate({
    description: "証明書を受け取る ssh-ed25519 の公開鍵（~/.ssh/win.pub の 1 行）",
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
