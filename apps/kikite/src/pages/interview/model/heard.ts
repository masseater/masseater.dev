import { Array as Arr, Clock, Effect } from "effect";

import { askingAtom, entriesAtom, heardAtom, interimAtom, listeningAtom } from "./atoms.ts";
import type { Entry } from "./atoms.ts";
import { modify, read, write } from "./registry.ts";

const heardSpeech = Effect.fn("kikite.heardSpeech")(function* heardSpeech(text: string) {
  const now = yield* Clock.currentTimeMillis;
  yield* modify(entriesAtom, (entries) => {
    const entry: Entry = { kind: "speech", id: entries.length, text };
    return Arr.append(entries, entry);
  });
  yield* modify(heardAtom, (heard) => ({ ...heard, lastSpeechAt: now, spokeSinceQuestion: true }));
  yield* write(interimAtom, "");
});

const heardInterim = Effect.fn("kikite.heardInterim")(function* heardInterim(
  text: string,
  cancelDrafting: Effect.Effect<void>,
) {
  yield* write(interimAtom, text);
  if (text === "") {
    return;
  }
  const now = yield* Clock.currentTimeMillis;
  yield* modify(heardAtom, (heard) => ({ ...heard, lastSpeechAt: now }));
  const asking = yield* read(askingAtom);
  if (asking.status === "drafting") {
    yield* cancelDrafting;
  }
});

const heardFailure = Effect.fn("kikite.heardFailure")(function* heardFailure(message: string) {
  yield* write(listeningAtom, { status: "failed", message });
});

/** @internal */
export { heardFailure, heardInterim, heardSpeech };
