import { useAtomSet } from "@effect/atom-react";
import { Button } from "@masseater.dev/ui/button";
import { Trash2 } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import type { Song } from "#/entities/library/index.ts";
import { removeAtom } from "#/features/remove-song/model/remove.ts";
import { LABELS } from "#/shared/config/index.ts";

export const RemoveSongButton = ({ song }: Readonly<{ song: Song }>): ReactNode => {
  const remove = useAtomSet(removeAtom);
  const click = useCallback(() => {
    remove(song);
  }, [remove, song]);
  return (
    <Button variant="outline" size="sm" className="justify-self-start" onClick={click}>
      <Trash2 aria-hidden />
      {LABELS.removeSong}
    </Button>
  );
};
