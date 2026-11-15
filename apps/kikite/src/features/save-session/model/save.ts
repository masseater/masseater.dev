import { useAtomSet } from "@effect/atom-react";
import { useCallback } from "react";

import { saveAtom } from "#/entities/interview";

export const useSave = (): (() => void) => {
  const save = useAtomSet(saveAtom);
  return useCallback(() => {
    save();
  }, [save]);
};
