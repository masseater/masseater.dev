import { Array as Arr, Clock, Effect, Option } from "effect";

import { parseDraft } from "#/pages/interview/lib/draft";
import { isFiller } from "#/pages/interview/lib/filler";

import {
  askingAtom,
  entriesAtom,
  heardAtom,
  interimAtom,
  listeningAtom,
  nudgeAtom,
  staleAtom,
} from "./atoms.ts";
import type { Asking, Entry, Input } from "./atoms.ts";
import { modify, read, write } from "./registry.ts";

const ONE = 1;

const touch = Effect.fn("kikite.touch")(function* touch() {
  const now = yield* Clock.currentTimeMillis;
  yield* modify(heardAtom, (heard) => ({ ...heard, lastActivityAt: now }));
  yield* write(staleAtom, false);
});

const nudgeAnswered = Effect.fn("kikite.nudgeAnswered")(function* nudgeAnswered(at: number) {
  const nudge = yield* read(nudgeAtom);
  yield* write(nudgeAtom, Option.none());
  if (Option.isSome(nudge)) {
    yield* modify(entriesAtom, (entries) => {
      const entry: Entry = {
        kind: "question",
        id: entries.length,
        at,
        strategy: Option.none(),
        reason: "",
        question: nudge.value.text,
        rating: "unrated",
      };
      return Arr.append(entries, entry);
    });
  }
});

const heardSpeech = Effect.fn("kikite.heardSpeech")(function* heardSpeech(text: string, by: Input) {
  yield* write(interimAtom, "");
  yield* touch();
  if (isFiller(text)) {
    return;
  }
  const now = yield* Clock.currentTimeMillis;
  yield* nudgeAnswered(now);
  yield* modify(entriesAtom, (entries) => {
    const entry: Entry = { kind: "speech", id: entries.length, at: now, text, by };
    return Arr.append(entries, entry);
  });
  yield* modify(heardAtom, (heard) => ({ ...heard, spokeSinceQuestion: true, lastInput: by }));
});

const withdrawable = (asking: Asking): boolean =>
  asking.status === "drafting" && parseDraft(asking.text).question === "";

const heardInterim = Effect.fn("kikite.heardInterim")(function* heardInterim(
  text: string,
  cancelDrafting: Effect.Effect<void>,
) {
  yield* write(interimAtom, text);
  if (text === "") {
    return;
  }
  yield* touch();
  if (isFiller(text)) {
    return;
  }
  const asking = yield* read(askingAtom);
  if (withdrawable(asking)) {
    yield* cancelDrafting;
    yield* modify(heardAtom, (heard) => ({ ...heard, withdrawn: heard.withdrawn + ONE }));
  }
});

const heardFailure = Effect.fn("kikite.heardFailure")(function* heardFailure(message: string) {
  yield* write(listeningAtom, { status: "failed", message });
});

/** @internal */
export { heardFailure, heardInterim, heardSpeech, touch };
