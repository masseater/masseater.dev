import { Clock, Duration, Effect, Option } from "effect";

import { AnalystFailed, analystFailed } from "#/features/mcp/model/analyst-failed";
import type {
  AnalysisRequestValue,
  AnalysisResultValue,
} from "#/features/mcp/model/trait-analysis";

import { encodeJson } from "./storage.server";
import { TraitAnalyst } from "./trait-analyst";
import { buildStep } from "./trait-build.server";
import type { StepFailure, StepOutcome } from "./trait-build.server";
import { RECORD_TOOL, TRAIT_MODEL, readTranscript } from "./trait-pi";
import { translateTraits } from "./trait-translate.server";
import { TraitTranslator, translatorOf } from "./trait-translator";
import type { TranslatorBinding } from "./trait-translator";

type Answer = Readonly<{ status: string; reason?: string; messages: readonly unknown[] }>;

type Conversation = Readonly<{
  reset: () => Promise<void>;
  prompt: (input: string) => Promise<Answer>;
}>;

type BuildSummary = Readonly<{ steps: number; idle: boolean }>;

type RunSummary = BuildSummary & Readonly<{ translated: number }>;

const AGENT = "trait-builder";

const BUDGET_MINUTES = 10;

const BUDGET = Duration.minutes(BUDGET_MINUTES);

const NONE_YET = 0;

const ONE_MORE = 1;

const reasonOf = (answer: Answer): string =>
  Option.getOrElse(Option.fromUndefinedOr(answer.reason), () => "");

const missingCall = (answer: Answer): AnalystFailed =>
  AnalystFailed.make({
    message: `no ${RECORD_TOOL} call (${answer.status} ${reasonOf(answer)})`,
  });

const analyze =
  (conversation: Conversation) =>
  (request: AnalysisRequestValue): Effect.Effect<AnalysisResultValue, AnalystFailed> =>
    Effect.gen(function* analyzeSources() {
      const input = yield* encodeJson(request);
      yield* Effect.tryPromise({ try: () => conversation.reset(), catch: analystFailed });
      const answer = yield* Effect.tryPromise({
        try: () => conversation.prompt(input),
        catch: analystFailed,
      });
      const transcript = readTranscript(answer.messages);
      yield* Effect.annotateCurrentSpan({
        "gen_ai.usage.input_tokens": transcript.inputTokens,
        "gen_ai.usage.output_tokens": transcript.outputTokens,
      });
      return yield* Effect.fromOption(transcript.result).pipe(
        Effect.mapError(() => missingCall(answer)),
      );
    }).pipe(
      Effect.withSpan(`invoke_agent ${AGENT}`, {
        kind: "client",
        attributes: {
          "gen_ai.operation.name": "invoke_agent",
          "gen_ai.agent.name": AGENT,
          "gen_ai.provider.name": "cloudflare.workers_ai",
          "gen_ai.request.model": TRAIT_MODEL,
        },
      }),
    );

const analystOf = (conversation: Conversation): TraitAnalyst["Service"] =>
  TraitAnalyst.of({ analyze: analyze(conversation) });

const stepsUntil = (
  deadline: number,
  done: number,
): Effect.Effect<BuildSummary, StepFailure, TraitAnalyst> =>
  Effect.gen(function* nextStep() {
    const outcome: StepOutcome = yield* buildStep;
    yield* Effect.logInfo("watashi.traits.step").pipe(Effect.annotateLogs(outcome));
    if (outcome.status === "idle") {
      return { steps: done, idle: true };
    }
    const now = yield* Clock.currentTimeMillis;
    if (now >= deadline) {
      return { steps: done + ONE_MORE, idle: false };
    }
    return yield* stepsUntil(deadline, done + ONE_MORE);
  });

const buildTraits = ({
  conversation,
  translator,
}: Readonly<{
  conversation: Conversation;
  translator: TranslatorBinding;
}>): Effect.Effect<RunSummary, StepFailure> =>
  Effect.gen(function* buildAll() {
    const start = yield* Clock.currentTimeMillis;
    const deadline = start + Duration.toMillis(BUDGET);
    const earlier = yield* translateTraits(deadline);
    const built = yield* stepsUntil(deadline, NONE_YET);
    const later = yield* translateTraits(deadline);
    return { ...built, translated: earlier + later };
  }).pipe(
    Effect.provideService(TraitAnalyst, analystOf(conversation)),
    Effect.provideService(TraitTranslator, translatorOf(translator)),
    Effect.withSpan("watashi.traits.build"),
  );

export { buildTraits };
export type { Answer, BuildSummary, Conversation, RunSummary };
