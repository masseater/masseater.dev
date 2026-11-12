import { Effect, Option } from "effect";
import { Atom } from "effect/reactivity";

import type { Recognition } from "#/pages/interview/lib/recognition";

import { hearingAtom, listeningAtom, recognitionAtom } from "./atoms.ts";
import { touch } from "./heard.ts";
import { read, write } from "./registry.ts";

const pause = Effect.fn("kikite.pauseMic")(function* pause(recognition: Recognition) {
  recognition.mute();
  yield* write(hearingAtom, false);
  yield* write(listeningAtom, { status: "paused" });
});

const resume = Effect.fn("kikite.resumeMic")(function* resume(recognition: Recognition) {
  recognition.unmute();
  yield* write(listeningAtom, { status: "listening" });
  yield* touch();
});

const toggleMic = Effect.fn("kikite.toggleMic")(function* toggleMic() {
  const recognition = yield* read(recognitionAtom);
  const { status } = yield* read(listeningAtom);
  if (Option.isNone(recognition)) {
    return;
  }
  if (status === "listening") {
    yield* pause(recognition.value);
  }
  if (status === "paused") {
    yield* resume(recognition.value);
  }
});

const toggleMicAtom = Atom.fn(() => toggleMic());

/** @internal */
export { toggleMicAtom };
