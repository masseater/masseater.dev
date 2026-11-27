import { useAtomValue } from "@effect/atom-react";
import { Effect } from "effect";
import { AsyncResult, Atom } from "effect/reactivity";
import { cancelRender, continueRender, delayRender } from "remotion";

import { loadFonts } from "./fonts.ts";

const fontsAtom = Atom.make(
  Effect.suspend(() => {
    const handle = delayRender("Loading fonts");
    return loadFonts.pipe(
      Effect.tap(() =>
        Effect.sync(() => {
          continueRender(handle);
        }),
      ),
      Effect.tapError((failure) =>
        Effect.sync(() => {
          cancelRender(failure);
        }),
      ),
    );
  }),
);

export const useFonts = (): boolean => {
  const result = useAtomValue(fontsAtom);
  return AsyncResult.isSuccess(result);
};
