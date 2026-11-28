import { Command } from "@effect/ui";
import { Effect, Schema } from "effect";

import { answerConsent } from "#/features/answer-consent/model/consent.ts";

import { ConsentPromptMessage } from "./consent-prompt-message.ts";

/** @stability experimental */
export class AnswerConsent extends Command.Service<AnswerConsent>()(
  "answer-consent/AnswerConsent",
  {
    args: { accept: Schema.Boolean },
    success: ConsentPromptMessage,
  },
) {
  public static readonly layer = this.toLayer(
    Effect.succeed(({ accept }) =>
      Effect.tryPromise({ try: () => answerConsent(accept), catch: () => "failed" as const }).pipe(
        Effect.match({
          onSuccess: () => ConsentPromptMessage.SucceededAnswerConsent(),
          onFailure: () => ConsentPromptMessage.FailedAnswerConsent(),
        }),
      ),
    ),
  );
}
