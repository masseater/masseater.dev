import { failedAt } from "@masseater.dev/mcp-tool-call";
import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { runWorkersAi } from "@r_masseater/workers-tracing/workers-ai";
import type { GatewayOptions } from "@r_masseater/workers-tracing/workers-ai";
import { Array as Arr, Effect, Schema } from "effect";

import { ProfileAuthor } from "#/entities/owner-profile/index.ts";
import type { ProfileRequest } from "#/entities/owner-profile/index.ts";

export const PROFILE_MODEL = "@cf/thinkingmachines/inkling-2-small";

const MAX_TOKENS = 40_000;

const AGENT = "profile-writer";

const Message = Schema.Struct({ content: Schema.String });

const Choice = Schema.Struct({ message: Message });

const Completion = Schema.Struct({ choices: Schema.NonEmptyArray(Choice) });

const fail = failedAt("workers-ai");

export type ProfileModel = Readonly<{
  run: (model: string, inputs: object, options: GatewayOptions) => Promise<unknown>;
}>;

const inputsOf = (request: ProfileRequest): object => ({
  messages: [
    { role: "system", content: request.instructions },
    { role: "user", content: request.input },
  ],
  response_format: {
    type: "json_schema",
    json_schema: { name: request.step, strict: true, schema: request.format },
  },
  max_tokens: MAX_TOKENS,
  reasoning_effort: "low",
});

const write =
  (ai: ProfileModel) =>
  (request: ProfileRequest): Effect.Effect<string, UpstreamFailed> =>
    runWorkersAi({
      operation: "chat",
      model: PROFILE_MODEL,
      caller: `watashi-mcp.${AGENT}`,
      prompt: `${AGENT}.${request.step}`,
      call: (options) => ai.run(PROFILE_MODEL, inputsOf(request), options),
    }).pipe(
      Effect.mapError(({ cause }) => fail(cause)),
      Effect.flatMap((raw) =>
        Schema.decodeUnknownEffect(Completion)(raw).pipe(Effect.mapError(fail)),
      ),
      Effect.map((completion) => Arr.headNonEmpty(completion.choices).message.content),
    );

export const profileAuthorOf = (ai: ProfileModel): ProfileAuthor["Service"] =>
  ProfileAuthor.of({ write: write(ai) });
