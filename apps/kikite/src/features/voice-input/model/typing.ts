import { Effect, Option } from "effect";
import type { AtomRegistry } from "effect/reactivity";

import { answerDraftAtom, listeningAtom, recognitionAtom, touch } from "#/entities/interview";
import type { Listening } from "#/entities/interview";
import type { Recognition } from "#/shared/lib/recognition";
import { read, write } from "#/shared/lib/registry";

type Registered<Value> = Effect.Effect<Value, never, AtomRegistry.AtomRegistry>;

const LISTENING: Listening = { status: "listening" };
const TYPING: Listening = { status: "typing" };

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

/** @internal */
export const typing = Effect.fn("kikite.typing")(function* typing(text: string) {
  yield* write(answerDraftAtom, text);
  yield* touch();
  const recognition = yield* read(recognitionAtom);
  const { status } = yield* read(listeningAtom);
  if (Option.isSome(recognition) && needsSwitch(text, status)) {
    yield* switchMic(recognition.value, text);
  }
});
