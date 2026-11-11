import { Effect, Option } from "effect";
import type { AtomRegistry } from "effect/reactivity";

import type { Recognition } from "#/pages/interview/lib/recognition";
import { speak } from "#/pages/interview/lib/speak";

import { answerDraftAtom, listeningAtom, recognitionAtom } from "./atoms.ts";
import type { Listening } from "./atoms.ts";
import { touch } from "./heard.ts";
import { read, write } from "./registry.ts";

type Registered<Value> = Effect.Effect<Value, never, AtomRegistry.AtomRegistry>;

const LISTENING: Listening = { status: "listening" };
const TYPING: Listening = { status: "typing" };

const afterSpeaking = Effect.fn("kikite.afterSpeaking")(function* afterSpeaking(
  recognition: Recognition,
) {
  const draft = yield* read(answerDraftAtom);
  if (draft !== "") {
    yield* write(listeningAtom, TYPING);
    return;
  }
  recognition.unmute();
  yield* write(listeningAtom, LISTENING);
});

const mutedWhile = <Value>(
  recognition: Recognition,
  effect: Effect.Effect<Value>,
): Registered<Value> =>
  Effect.acquireUseRelease(
    Effect.andThen(
      Effect.sync(() => {
        recognition.mute();
      }),
      write(listeningAtom, { status: "speaking" }),
    ),
    () => effect,
    () => afterSpeaking(recognition),
  );

const voice = Effect.fn("kikite.voice")(function* voice(text: string) {
  const recognition = yield* read(recognitionAtom);
  yield* Option.match(recognition, {
    onNone: () => speak(text),
    onSome: (listener) => mutedWhile(listener, speak(text)),
  });
  yield* touch();
});

const switchMic = (recognition: Recognition, text: string): Registered<void> => {
  if (text === "") {
    recognition.unmute();
    return write(listeningAtom, LISTENING);
  }
  recognition.mute();
  return write(listeningAtom, TYPING);
};

const needsSwitch = (text: string, status: Listening["status"]): boolean =>
  (text === "" && status === "typing") || (text !== "" && status === "listening");

const typing = Effect.fn("kikite.typing")(function* typing(text: string) {
  yield* write(answerDraftAtom, text);
  yield* touch();
  const recognition = yield* read(recognitionAtom);
  const { status } = yield* read(listeningAtom);
  if (Option.isSome(recognition) && needsSwitch(text, status)) {
    yield* switchMic(recognition.value, text);
  }
});

/** @internal */
export { typing, voice };
