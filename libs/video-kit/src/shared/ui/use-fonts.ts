import { useAtomValue } from "@effect/atom-react";
import { holdRender } from "@masseater.dev/tachie";
import { AsyncResult, Atom } from "effect/reactivity";

import { loadFonts } from "./fonts.ts";

const fontsAtom = Atom.make(loadFonts.pipe(holdRender("Loading fonts")));

export const useFonts = (): boolean => {
  const result = useAtomValue(fontsAtom);
  return AsyncResult.isSuccess(result);
};
