import { Effect, Option, Stream } from "effect";
import type { HttpClient } from "effect/http";
import type { AtomRegistry } from "effect/reactivity";

import { questionText } from "#/shared/api";
import type { InterviewerFailed } from "#/shared/api";
import type { InterviewSetup, QuestionBody } from "#protocol";
import { STRATEGY_IDS } from "#strategies";
import type { StrategyId } from "#strategies";

import {
  askingAtom,
  entriesAtom,
  heardAtom,
  settingsAtom,
  summaryAtom,
  summaryOf,
} from "./atoms.ts";
import { IDLE, draftingFor, settled, withDraft } from "./drafts.ts";
import { modify, read, write } from "./registry.ts";
import { askedOf, recentOf } from "./transcript.ts";

type Services = AtomRegistry.AtomRegistry | HttpClient.HttpClient;
type DraftText = Stream.Stream<string, InterviewerFailed, HttpClient.HttpClient>;

const strategiesFor = (compare: boolean, strategy: StrategyId): readonly StrategyId[] => {
  if (compare) {
    return STRATEGY_IDS;
  }
  return [strategy];
};

const bodyFor = Effect.fn("kikite.questionBody")(function* bodyFor(setup: InterviewSetup) {
  const entries = yield* read(entriesAtom);
  const summary = yield* read(summaryAtom);
  const { model } = yield* read(settingsAtom);
  return (strategy: StrategyId): QuestionBody => ({
    setup,
    strategy,
    model,
    summary: summaryOf(summary),
    recent: recentOf(entries),
    asked: askedOf(entries),
  });
});

const textFor = (body: QuestionBody): DraftText => questionText(body);

const draft = (body: QuestionBody): Effect.Effect<void, never, Services> =>
  textFor(body).pipe(
    Stream.runForEach((text) => modify(askingAtom, withDraft(body.strategy, { text }))),
    Effect.matchEffect({
      onSuccess: () => modify(askingAtom, withDraft(body.strategy, { status: "done" })),
      onFailure: ({ message }) =>
        modify(askingAtom, withDraft(body.strategy, { status: "failed", text: message })),
    }),
  );

const begin = Effect.fn("kikite.beginAsking")(function* begin(strategies: readonly StrategyId[]) {
  yield* write(askingAtom, draftingFor(strategies));
  yield* modify(heardAtom, (heard) => ({ ...heard, spokeSinceQuestion: false }));
});

const ask = Effect.fn("kikite.ask")(function* ask(setup: InterviewSetup) {
  const asking = yield* read(askingAtom);
  if (asking.status !== "idle") {
    return Option.none<StrategyId>();
  }
  const { compare, strategy } = yield* read(settingsAtom);
  const strategies = strategiesFor(compare, strategy);
  yield* begin(strategies);
  const body = yield* bodyFor(setup);
  yield* Effect.forEach(strategies, (id) => draft(body(id)), {
    concurrency: "unbounded",
    discard: true,
  }).pipe(Effect.onInterrupt(() => write(askingAtom, IDLE)));
  yield* modify(askingAtom, settled);
  return Option.liftPredicate(strategy, () => !compare);
});

/** @internal */
export { ask };
