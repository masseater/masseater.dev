import { useAtomSet } from "@effect/atom-react";
import { useCallback } from "react";

import { entriesAtom, rated, uploadAtom } from "#/entities/interview/index.ts";
import type { Rating } from "#/entities/interview/index.ts";

export const useRate = (id: number): ((rating: Rating) => void) => {
  const setEntries = useAtomSet(entriesAtom);
  const upload = useAtomSet(uploadAtom);
  return useCallback(
    (rating: Rating) => {
      setEntries(rated({ id, rating }));
      upload();
    },
    [setEntries, upload, id],
  );
};
