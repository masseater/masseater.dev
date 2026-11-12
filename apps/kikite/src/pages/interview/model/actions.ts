import { Array as Arr, Effect, Option, pipe } from "effect";

import { activatedNow } from "#/pages/interview/lib/activation";

import { ask } from "./ask.ts";
import { activatedAtom, heardAtom, hearingAtom, listeningAtom, speakerAtom } from "./atoms.ts";
import { heardFailure, heardInterim, heardSpeech } from "./heard.ts";
import { nudge } from "./nudge.ts";
import { read, write } from "./registry.ts";
import { runners } from "./runners.ts";
import { summarize } from "./summarize.ts";
import { typing, voice } from "./voice.ts";

type Actions = Readonly<{
  answer: (text: string) => void;
  typed: (text: string) => void;
  typing: (text: string) => void;
  ask: () => void;
  summarize: () => void;
  nudge: (level: number) => void;
  interim: (text: string) => void;
  failed: (message: string) => void;
  sound: (hearing: boolean) => void;
  activate: () => void;
}>;

const voiceIfWanted = Effect.fn("kikite.voiceIfWanted")(function* voiceIfWanted(text: string) {
  const speaker = yield* read(speakerAtom);
  const { lastInput } = yield* read(heardAtom);
  const { status } = yield* read(listeningAtom);
  const wanted = [speaker, lastInput === "voice", status !== "paused", activatedNow()];
  if (pipe(wanted, Arr.every(Boolean))) {
    yield* voice(text);
  }
});

const typedAnswer = Effect.fn("kikite.typedAnswer")(function* typedAnswer(text: string) {
  yield* heardSpeech(text, "typed");
  yield* typing("");
});

const actionsFor = Effect.gen(function* actionsFor() {
  const run = yield* runners;
  const spoken = (question: Option.Option<string>): Effect.Effect<void> =>
    Effect.sync(() => {
      pipe(
        question,
        Option.map((text) => run.voicing(voiceIfWanted(text))),
      );
    });
  const asked = Effect.flatMap(ask(), spoken);
  const askNow = (): void => {
    run.asking(asked, { onlyIfMissing: true });
  };
  const cancelDrafting = Effect.sync(() => {
    run.asking(Effect.void);
  });
  const actions: Actions = {
    ask: askNow,
    summarize: () => {
      run.summarizing(summarize(), { onlyIfMissing: true });
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
      run.events(write(hearingAtom, hearing));
    },
    activate: () => {
      run.events(write(activatedAtom, true));
    },
  };
  return actions;
});

/** @internal */
export { actionsFor };
export type { Actions };
