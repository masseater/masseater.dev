import { READ_ONLY, compactInput, failedAt } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import { runWorkersAi } from "@r_masseater/workers-tracing/workers-ai";
import { env } from "cloudflare:workers";
import { Effect, Schema } from "effect";

import { runTool } from "#/shared/api/index.ts";

import { DecideInput, Decided } from "./decide-input.ts";

const MODEL = "@cf/cloudflare/clef-flash";
const MODEL_SELECTOR = "clef-flash";

const DESCRIPTION =
  "Answer choice questions about given text with the Clef Flash decision model. Returns the chosen option and each option's probability per question. Selects only; never writes text.";

const INPUT_SCHEMA = DecideInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const fail = failedAt("decision model");

const decode = Schema.decodeUnknownEffect(Decided);

export const decide = Effect.fn("decide")(function* decide(input: typeof DecideInput.Type) {
  const output = yield* runWorkersAi({
    operation: "decision",
    model: MODEL,
    caller: "sundries.decide",
    call: (options) =>
      env.AI.run(
        MODEL,
        { model: MODEL_SELECTOR, state: { snippets: input.snippets }, questions: input.questions },
        options,
      ),
  }).pipe(Effect.mapError(({ cause }) => fail(cause)));
  return yield* decode(output).pipe(Effect.mapError(fail));
});

export const registerDecideTools = (server: McpServer): McpServer => {
  server.registerTool(
    "decide",
    {
      description: DESCRIPTION,
      inputSchema: compactInput(INPUT_SCHEMA),
      annotations: READ_ONLY,
    },
    (input) => decide(input).pipe(runTool({ count: ({ answers }) => Object.keys(answers).length })),
  );
  return server;
};
