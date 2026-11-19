import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Duration, Effect } from "effect";
import { Atom } from "effect/reactivity";

export type Copy = "idle" | "copied" | "failed";

const SHOWN_FOR = Duration.fromInputUnsafe("1500 millis");

const copiedAtom = Atom.make<Copy>("idle");

const copyAtom = Atom.fn<string>()((text, get) =>
  Effect.gen(function* copy() {
    const outcome = yield* Effect.tryPromise({
      try: () => navigator.clipboard.writeText(text),
      catch: () => "denied" as const,
    }).pipe(
      Effect.match({
        onFailure: (): Copy => "failed",
        onSuccess: (): Copy => "copied",
      }),
    );
    get.set(copiedAtom, outcome);
    yield* Effect.sleep(SHOWN_FOR);
    get.set(copiedAtom, "idle");
  }),
);

export const useCopy = (): Copy => useAtomValue(copiedAtom);

export const useCopyText = (): ((text: string) => void) => useAtomSet(copyAtom);
