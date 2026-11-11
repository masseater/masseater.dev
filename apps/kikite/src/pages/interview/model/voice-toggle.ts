import { Effect } from "effect";
import { Atom } from "effect/reactivity";

import { activatedAtom, speakerAtom } from "./atoms.ts";
import { rememberSpeaker } from "./memory.ts";
import { read, write } from "./registry.ts";

const toggleVoice = Effect.fn("kikite.toggleVoice")(function* toggleVoice() {
  const speaker = yield* read(speakerAtom);
  const activated = yield* read(activatedAtom);
  const next = !(speaker && activated);
  yield* write(activatedAtom, true);
  yield* write(speakerAtom, next);
  yield* rememberSpeaker(next);
});

const toggleVoiceAtom = Atom.fn(() => toggleVoice());

/** @internal */
export { toggleVoiceAtom };
