import { failedAt } from "@masseater.dev/mcp-tool-call";
import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { Array as Arr, Effect, Schema } from "effect";

import { ProfileAuthor } from "#/entities/owner-profile/index.ts";
import type { ProfileRequest } from "#/entities/owner-profile/index.ts";

export const PROFILE_MODEL = "@cf/thinkingmachines/inkling-2-small";

const MAX_TOKENS = 40_000;

const AGENT = "profile-writer";

const Message = Schema.Struct({ content: Schema.String });

const Choice = Schema.Struct({ message: Message });

const Usage = Schema.Struct({ prompt_tokens: Schema.Finite, completion_tokens: Schema.Finite });

const Completion = Schema.Struct({ choices: Schema.NonEmptyArray(Choice), usage: Usage });

const fail = failedAt("workers-ai");

export type ProfileModel = Readonly<{ run: (model: string, inputs: object) => Promise<unknown> }>;

const write =
  (ai: ProfileModel) =>
  (request: ProfileRequest): Effect.Effect<string, UpstreamFailed> =>
    Effect.tryPromise({
      try: () =>
        ai.run(PROFILE_MODEL, {
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
        }),
      catch: fail,
    }).pipe(
      Effect.flatMap((raw) =>
        Schema.decodeUnknownEffect(Completion)(raw).pipe(Effect.mapError(fail)),
      ),
      Effect.tap((completion) =>
        Effect.annotateCurrentSpan({
          "gen_ai.usage.input_tokens": completion.usage.prompt_tokens,
          "gen_ai.usage.output_tokens": completion.usage.completion_tokens,
        }),
      ),
      Effect.map((completion) => Arr.headNonEmpty(completion.choices).message.content),
      Effect.withSpan(`chat ${PROFILE_MODEL}`, {
        kind: "client",
        attributes: {
          "gen_ai.operation.name": "chat",
          "gen_ai.agent.name": `${AGENT}.${request.step}`,
          "gen_ai.provider.name": "cloudflare.workers_ai",
          "gen_ai.request.model": PROFILE_MODEL,
        },
      }),
    );

export const profileAuthorOf = (ai: ProfileModel): ProfileAuthor["Service"] =>
  ProfileAuthor.of({ write: write(ai) });
