import { useAtomValue } from "@effect/atom-react";
import { Effect } from "effect";
import { AsyncResult, Atom } from "effect/reactivity";
import { cancelRender, continueRender, delayRender } from "remotion";

import { loadFonts } from "./fonts.ts";

const fontsAtom = Atom.family((text: string) =>
  Atom.make(
    Effect.suspend(() => {
      const handle = delayRender("Loading fonts");
      return loadFonts(text).pipe(
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
  ),
);

export const useFonts = (text: string): boolean => {
  const atom = fontsAtom(text);
  const result = useAtomValue(atom);
  return AsyncResult.isSuccess(result);
};
