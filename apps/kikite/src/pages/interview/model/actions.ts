import { Effect } from "effect";

import { heardFailure, heardInterim, heardSound, heardSpeech } from "#/entities/interview";
import { ask, nudge, summarize, wrapUp, wrapUpIfAsked } from "#/features/ask-question";
import { typing } from "#/features/voice-input";
import { runners } from "#/shared/lib/runners";

import { assistWith } from "./assist.ts";

type Actions = Readonly<{
  wrapUp: () => void;
  answer: (text: string) => void;
  typed: (text: string) => void;
  typing: (text: string) => void;
  ask: () => void;
  summarize: () => void;
  nudge: (level: number) => void;
  interim: (text: string) => void;
  failed: (message: string) => void;
  sound: (hearing: boolean) => void;
}>;

const typedAnswer = Effect.fn("kikite.typedAnswer")(function* typedAnswer(text: string) {
  yield* heardSpeech(text, "typed");
  yield* typing("");
});

const actionsFor = Effect.gen(function* actionsFor() {
  const run = yield* runners;
  const asked = Effect.andThen(ask(), wrapUpIfAsked());
  const askNow = (): void => {
    run.asking(asked, { onlyIfMissing: true });
  };
  const cancelDrafting = Effect.sync(() => {
    run.asking(Effect.void);
  });
  const assist = assistWith(run);
  const actions: Actions = {
    wrapUp: () => {
      run.asking(wrapUp());
    },
    ask: askNow,
    summarize: () => {
      run.summarizing(Effect.andThen(summarize(), assist), { onlyIfMissing: true });
    },
    nudge: (level) => {
      run.events(nudge(level));
    },
    answer: (text) => {
      run.events(heardSpeech(text, "voice"));
    },
    typed: (text) => {
      run.events(Effect.tap(typedAnswer(text), Effect.sync(askNow)));
    },
    typing: (text) => {
      run.events(typing(text));
    },
    interim: (text) => {
      run.events(heardInterim(text, cancelDrafting));
    },
    failed: (message) => {
      run.events(heardFailure(message));
    },
    sound: (hearing) => {
      run.events(heardSound(hearing));
    },
  };
  return actions;
});

/** @internal */
export { actionsFor };
export type { Actions };
