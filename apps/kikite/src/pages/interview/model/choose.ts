import { Array as Arr, Effect, Option, pipe } from "effect";
import type { AtomRegistry } from "effect/reactivity";

import type { StrategyId } from "#strategies";

import { askingAtom, choicesAtom, entriesAtom, settingsAtom } from "./atoms.ts";
import type { Candidate, Entry } from "./atoms.ts";
import { IDLE, candidatesOf } from "./drafts.ts";
import { modify, read, write } from "./registry.ts";

type Registered = Effect.Effect<void, never, AtomRegistry.AtomRegistry>;

const SINGLE = 1;

const recordChoice = (strategy: StrategyId, candidates: readonly Candidate[]): Registered =>
  Effect.when(
    modify(choicesAtom, (choices) => Arr.append(choices, { chosen: strategy, candidates })),
    Effect.succeed(candidates.length > SINGLE),
  ).pipe(Effect.asVoid);

const pushQuestion = (candidate: Candidate): Registered =>
  modify(entriesAtom, (entries) => {
    const entry: Entry = { kind: "question", id: entries.length, ...candidate };
    return Arr.append(entries, entry);
  });

const takeCandidates = Effect.fn("kikite.takeCandidates")(function* takeCandidates() {
  const asking = yield* read(askingAtom);
  yield* write(askingAtom, IDLE);
  if (asking.status === "idle") {
    return [];
  }
  return candidatesOf(asking.drafts);
});

const choose = Effect.fn("kikite.choose")(function* choose(strategy: StrategyId) {
  const candidates = yield* takeCandidates();
  const chosen = pipe(
    candidates,
    Arr.findFirst((candidate) => candidate.strategy === strategy && candidate.question !== ""),
  );
  if (Option.isNone(chosen)) {
    return Option.none<string>();
  }
  yield* recordChoice(strategy, candidates);
  yield* pushQuestion(chosen.value);
  const { speak } = yield* read(settingsAtom);
  return Option.liftPredicate(chosen.value.question, () => speak);
});

/** @internal */
export { choose };
