import { Effect, Option } from "effect";

import { listen } from "#/pages/interview/lib/recognition";

import {
  FRESH_HEARD,
  askingAtom,
  choicesAtom,
  entriesAtom,
  heardAtom,
  interimAtom,
  listeningAtom,
  recognitionAtom,
  summaryAtom,
} from "./atoms.ts";
import type { Listening } from "./atoms.ts";
import { IDLE } from "./drafts.ts";
import { write } from "./registry.ts";

type Listeners = Readonly<{
  answer: (text: string) => void;
  interim: (text: string) => void;
  failed: (message: string) => void;
}>;

const UNSUPPORTED: Listening = { status: "unsupported" };
const LISTENING: Listening = { status: "listening" };

const reset = Effect.all([
  write(entriesAtom, []),
  write(choicesAtom, []),
  write(summaryAtom, { status: "empty" }),
  write(interimAtom, ""),
  write(askingAtom, IDLE),
  write(heardAtom, FRESH_HEARD),
]);

const release = Effect.all([
  write(listeningAtom, { status: "off" }),
  write(recognitionAtom, Option.none()),
  write(askingAtom, IDLE),
]);

const startListening = Effect.fn("kikite.startListening")(function* startListening(
  listeners: Listeners,
) {
  const recognition = yield* listen({
    onFinal: listeners.answer,
    onInterim: listeners.interim,
    onFailed: listeners.failed,
  });
  yield* write(recognitionAtom, recognition);
  yield* write(
    listeningAtom,
    Option.match(recognition, { onNone: () => UNSUPPORTED, onSome: () => LISTENING }),
  );
});

/** @internal */
export { release, reset, startListening };
