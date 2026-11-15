import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Duration, Effect } from "effect";
import { Atom } from "effect/reactivity";

export type Copy = "idle" | "copied";

const COPIED_FOR = Duration.fromInputUnsafe("1500 millis");

const copiedAtom = Atom.make<Copy>("idle");

const copyAtom = Atom.fn<string>()((text, get) =>
  Effect.gen(function* copy() {
    yield* Effect.promise(() => navigator.clipboard.writeText(text));
    get.set(copiedAtom, "copied");
    yield* Effect.sleep(COPIED_FOR);
    get.set(copiedAtom, "idle");
  }),
);

export const useCopy = (): Copy => useAtomValue(copiedAtom);

export const useCopyText = (): ((text: string) => void) => useAtomSet(copyAtom);
