import { Clock, Effect, Option } from "effect";

import { listen } from "#/pages/interview/lib/recognition";

import {
  answerDraftAtom,
  askingAtom,
  entriesAtom,
  freshHeard,
  heardAtom,
  hearingAtom,
  interimAtom,
  listeningAtom,
  nudgeAtom,
  progressAtom,
  recognitionAtom,
  staleAtom,
  summaryAtom,
} from "./atoms.ts";
import type { Listening } from "./atoms.ts";
import { write } from "./registry.ts";

type Listeners = Readonly<{
  answer: (text: string) => void;
  interim: (text: string) => void;
  failed: (message: string) => void;
  sound: (hearing: boolean) => void;
}>;

const UNSUPPORTED: Listening = { status: "unsupported" };
const LISTENING: Listening = { status: "listening" };
const IDLE = { status: "idle" } as const;

const reset = Effect.gen(function* reset() {
  const now = yield* Clock.currentTimeMillis;
  yield* Effect.all([
    write(entriesAtom, []),
    write(summaryAtom, { status: "empty" }),
    write(interimAtom, ""),
    write(answerDraftAtom, ""),
    write(askingAtom, IDLE),
    write(heardAtom, freshHeard(now)),
    write(progressAtom, []),
    write(nudgeAtom, Option.none()),
    write(staleAtom, false),
  ]);
});

const release = Effect.all([
  write(listeningAtom, { status: "off" }),
  write(recognitionAtom, Option.none()),
  write(askingAtom, IDLE),
  write(hearingAtom, false),
]);

const startListening = Effect.fn("kikite.startListening")(function* startListening(
  listeners: Listeners,
) {
  const recognition = yield* listen({
    onFinal: listeners.answer,
    onInterim: listeners.interim,
    onFailed: listeners.failed,
    onSound: listeners.sound,
  });
  yield* write(recognitionAtom, recognition);
  yield* write(
    listeningAtom,
    Option.match(recognition, { onNone: () => UNSUPPORTED, onSome: () => LISTENING }),
  );
});

/** @internal */
export { release, reset, startListening };
