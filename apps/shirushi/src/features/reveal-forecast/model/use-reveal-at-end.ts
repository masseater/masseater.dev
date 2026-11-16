import { useAtomSet } from "@effect/atom-react";
import { usePosition } from "@masseater.dev/media-notes-ui";
import { useEffect } from "react";

import { revealedAtom } from "./revealed.ts";

const NEAR_END = 1;

const NONE = 0;

export const useRevealAtEnd = (): void => {
  const { current, duration } = usePosition();
  const reveal = useAtomSet(revealedAtom);
  const ended = duration > NONE && current >= duration - NEAR_END;
  useEffect(() => {
    if (ended) {
      reveal(true);
    }
  }, [ended, reveal]);
};
