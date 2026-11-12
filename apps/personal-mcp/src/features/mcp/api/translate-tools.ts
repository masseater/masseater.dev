import type { Caller, UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { failedAt, NO_PROJECT } from "@masseater.dev/mcp-tool-call";
import { TranslateRequest } from "@masseater.dev/plamo-translate-protocol";
import type { TranslateRequestValue } from "@masseater.dev/plamo-translate-protocol";
import type { McpServer } from "@modelcontextprotocol/server";
import { env } from "cloudflare:workers";
import { Effect, Schema } from "effect";

import { meteredInput, runTool } from "./tool-call";

const ONE_TEXT = 1;

const DESCRIPTION =
  "PLaMo 3 Translate（Built with PLaMo）で文を訳す。to は ja・en・zh-hans などの訳す先の言語で、from を省くとモデルが元の言語を見分ける。form は日本語に訳すときだけ plain（だ・である）か polite（です・ます）を選べる。長い文は空行で区切って前の区切りの訳を添えながら訳す。";

const INPUT_SCHEMA = TranslateRequest.pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
);

const fail = failedAt("plamo-translate");

const translate = (
  request: TranslateRequestValue,
): Effect.Effect<Readonly<{ text: string }>, UpstreamFailed> =>
  Effect.tryPromise({ try: () => env.TRANSLATOR.translate(request), catch: fail });

const registerTranslateTools =
  (caller: Caller) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "translate",
      {
        description: DESCRIPTION,
        inputSchema: meteredInput({ tool: "translate", caller, project: NO_PROJECT })(INPUT_SCHEMA),
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      (input) =>
        translate(input).pipe(
          runTool({ tool: "translate", caller, project: NO_PROJECT, input, count: () => ONE_TEXT }),
        ),
    );
    return server;
  };

export { registerTranslateTools };
