import { Clock, Effect, Option } from "effect";
import type { AtomRegistry } from "effect/reactivity";

import type { Recognition } from "#/pages/interview/lib/recognition";
import { speak } from "#/pages/interview/lib/speak";

import { heardAtom, listeningAtom, recognitionAtom } from "./atoms.ts";
import { modify, read, write } from "./registry.ts";

const mutedWhile = <Value>(
  recognition: Recognition,
  effect: Effect.Effect<Value>,
): Effect.Effect<Value, never, AtomRegistry.AtomRegistry> =>
  Effect.acquireUseRelease(
    Effect.andThen(
      Effect.sync(() => {
        recognition.mute();
      }),
      write(listeningAtom, { status: "muted" }),
    ),
    () => effect,
    () =>
      Effect.andThen(
        Effect.sync(() => {
          recognition.unmute();
        }),
        write(listeningAtom, { status: "listening" }),
      ),
  );

const voice = Effect.fn("kikite.voice")(function* voice(text: string) {
  const recognition = yield* read(recognitionAtom);
  yield* Option.match(recognition, {
    onNone: () => speak(text),
    onSome: (listener) => mutedWhile(listener, speak(text)),
  });
  const now = yield* Clock.currentTimeMillis;
  yield* modify(heardAtom, (heard) => ({ ...heard, lastSpeechAt: now }));
});

/** @internal */
export { voice };
