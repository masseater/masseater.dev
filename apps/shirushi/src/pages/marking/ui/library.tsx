import { useAtomSet } from "@effect/atom-react";
import { linkAtom, openLinkAtom, pageOf } from "@masseater.dev/media-notes-ui";
import type { Mark } from "@masseater.dev/shirushi-protocol";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { MarkList, removeAtom, useMarks } from "#/entities/mark/index.ts";

export const Library = (): ReactNode => {
  const marks = useMarks(Option.none());
  const setLink = useAtomSet(linkAtom);
  const open = useAtomSet(openLinkAtom);
  const remove = useAtomSet(removeAtom);
  const pick = useCallback(
    ({ song }: Mark) => {
      Option.map(pageOf(song.source), (page) => {
        setLink(page);
        open(page);
        return page;
      });
    },
    [setLink, open],
  );
  return (
    <section className="max-w-2xl">
      <MarkList marks={marks} showSong onPick={pick} onRemove={remove} />
    </section>
  );
};
