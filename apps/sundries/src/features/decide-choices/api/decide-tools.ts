import { READ_ONLY, failedAt, toolInputOf, registeredTool } from "@masseater.dev/mcp-tool-call";
import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import type { McpServer } from "@modelcontextprotocol/server";
import { runWorkersAi } from "@r_masseater/workers-tracing/workers-ai";
import type { GatewayOptions } from "@r_masseater/workers-tracing/workers-ai";
import { Effect, Record as Rec, Schema } from "effect";

import { runTool } from "#/shared/api/index.ts";

import { DecideInput, Decided } from "./decide-input.ts";

const MODEL = "@cf/cloudflare/clef-flash";
const MODEL_SELECTOR = "clef-flash";

const DESCRIPTION =
  "Answer choice questions about given text with the Clef Flash decision model. Returns the chosen option and each option's probability per question. Selects only; never writes text.";

const INPUT_SCHEMA = toolInputOf(DecideInput);

const fail = failedAt("decision model");

const decode = Schema.decodeUnknownEffect(Decided);

export type DecisionRequest = Readonly<{
  model: string;
  state: Readonly<{ snippets: (typeof DecideInput.Type)["snippets"] }>;
  questions: (typeof DecideInput.Type)["questions"];
}>;

export type DecideBindings = Readonly<{
  AI: Readonly<{
    run: (model: string, request: DecisionRequest, options: GatewayOptions) => Promise<unknown>;
  }>;
}>;

export type Decide = (
  input: typeof DecideInput.Type,
) => Effect.Effect<typeof Decided.Type, UpstreamFailed>;

export const decide = ({ AI }: DecideBindings): Decide =>
  Effect.fn("decide")(function* decideWith(input: typeof DecideInput.Type) {
    const output = yield* runWorkersAi({
      operation: "decision",
      model: MODEL,
      caller: "sundries.decide",
      call: (options) =>
        AI.run(
          MODEL,
          {
            model: MODEL_SELECTOR,
            state: { snippets: input.snippets },
            questions: input.questions,
          },
          options,
        ),
    }).pipe(Effect.mapError(({ cause }) => fail(cause)));
    return yield* decode(output).pipe(Effect.mapError(fail));
  });

export const registerDecideTools = (bindings: DecideBindings): ((server: McpServer) => McpServer) =>
  registeredTool(
    { name: "decide", description: DESCRIPTION, inputSchema: INPUT_SCHEMA, annotations: READ_ONLY },
    (input) => decide(bindings)(input).pipe(runTool({ count: ({ answers }) => Rec.size(answers) })),
  );
