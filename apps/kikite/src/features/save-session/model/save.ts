import { useAtomSet } from "@effect/atom-react";
import { useCallback } from "react";

import { saveAtom } from "#/entities/interview/index.ts";

export const useSave = (): (() => void) => {
  const save = useAtomSet(saveAtom);
  return useCallback(() => {
    save();
  }, [save]);
};
