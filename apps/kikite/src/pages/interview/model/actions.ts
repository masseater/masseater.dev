import { Effect, Option } from "effect";

import type { InterviewSetup } from "#protocol";
import type { StrategyId } from "#strategies";

import { ask } from "./ask.ts";
import { choose } from "./choose.ts";
import { heardFailure, heardInterim, heardSpeech } from "./heard.ts";
import { runners } from "./runners.ts";
import { summarize } from "./summarize.ts";
import { voice } from "./voice.ts";

type Actions = Readonly<{
  answer: (text: string) => void;
  ask: () => void;
  choose: (strategy: StrategyId) => void;
  summarize: () => void;
  interim: (text: string) => void;
  failed: (message: string) => void;
}>;

const actionsFor = Effect.fn("kikite.actions")(function* actionsFor(setup: InterviewSetup) {
  const run = yield* runners;
  const spoken = (question: Option.Option<string>): Effect.Effect<void> =>
    Effect.sync(() => {
      Option.match(question, { onNone: () => false, onSome: (text) => run.voicing(voice(text)) });
    });
  const chosen = (strategy: StrategyId): ReturnType<typeof choose> =>
    Effect.tap(choose(strategy), spoken);
  const asked = ask(setup).pipe(
    Effect.flatMap(Option.match({ onNone: () => Effect.void, onSome: chosen })),
  );
  const cancelDrafting = Effect.sync(() => {
    run.asking(Effect.void);
  });
  const actions: Actions = {
    ask: () => {
      run.asking(asked, { onlyIfMissing: true });
    },
    summarize: () => {
      run.summarizing(summarize(setup), { onlyIfMissing: true });
    },
    choose: (strategy) => {
      run.events(chosen(strategy));
    },
    answer: (text) => {
      run.events(heardSpeech(text));
    },
    interim: (text) => {
      run.events(heardInterim(text, cancelDrafting));
    },
    failed: (message) => {
      run.events(heardFailure(message));
    },
  };
  return actions;
});

/** @internal */
export { actionsFor };
export type { Actions };
