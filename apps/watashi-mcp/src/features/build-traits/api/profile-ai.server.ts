import { failedAt } from "@masseater.dev/mcp-tool-call";
import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { Array as Arr, Effect, Schema } from "effect";

import { ProfileAuthor } from "#/entities/owner-profile/index.ts";

import { PROFILE_INSTRUCTIONS } from "./profile-prompt.ts";
import { TRAIT_MODEL } from "./trait-pi.ts";

const MAX_TOKENS = 8000;

const AGENT = "profile-writer";

const Message = Schema.Struct({ content: Schema.String });

const Choice = Schema.Struct({ message: Message });

const Usage = Schema.Struct({ prompt_tokens: Schema.Finite, completion_tokens: Schema.Finite });

const Completion = Schema.Struct({ choices: Schema.NonEmptyArray(Choice), usage: Usage });

const fail = failedAt("workers-ai");

export type ProfileModel = Readonly<{ run: (model: string, inputs: object) => Promise<unknown> }>;

const write =
  (ai: ProfileModel) =>
  (input: string): Effect.Effect<string, UpstreamFailed> =>
    Effect.tryPromise({
      try: () =>
        ai.run(TRAIT_MODEL, {
          messages: [
            { role: "system", content: PROFILE_INSTRUCTIONS },
            { role: "user", content: input },
          ],
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
      Effect.withSpan(`chat ${TRAIT_MODEL}`, {
        kind: "client",
        attributes: {
          "gen_ai.operation.name": "chat",
          "gen_ai.agent.name": AGENT,
          "gen_ai.provider.name": "cloudflare.workers_ai",
          "gen_ai.request.model": TRAIT_MODEL,
        },
      }),
    );

export const profileAuthorOf = (ai: ProfileModel): ProfileAuthor["Service"] =>
  ProfileAuthor.of({ write: write(ai) });
