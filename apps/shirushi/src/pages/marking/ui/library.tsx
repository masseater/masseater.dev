import { useAtomSet } from "@effect/atom-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { MarkList, removeAtom, useMarks } from "#/entities/mark/index.ts";
import { linkAtom, loadAtom } from "#/features/load-song/index.ts";
import type { Mark } from "#/shared/api/index.ts";
import { pageOf } from "#/shared/lib/source.ts";

const EVERY_SONG = "";

export const Library = (): ReactNode => {
  const marks = useMarks(EVERY_SONG);
  const setLink = useAtomSet(linkAtom);
  const load = useAtomSet(loadAtom);
  const remove = useAtomSet(removeAtom);
  const pick = useCallback(
    ({ song }: Mark) => {
      const page = pageOf(song.source);
      setLink(page);
      load(page);
    },
    [setLink, load],
  );
  const removeOne = useCallback(
    (id: string) => {
      remove({ id, link: EVERY_SONG });
    },
    [remove],
  );
  return (
    <section className="max-w-2xl">
      <MarkList marks={marks} showSong onPick={pick} onRemove={removeOne} />
    </section>
  );
};
