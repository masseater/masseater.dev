import { useAtomSet } from "@effect/atom-react";
import { linkAtom, openLinkAtom, pageOf } from "@masseater.dev/media-notes-ui";
import type { Mark } from "@masseater.dev/shirushi-protocol";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { MarkList, removeAtom, useMarks } from "#/entities/mark/index.ts";

import { TasteTabs } from "./taste-tabs.tsx";
import { useTasteTabs } from "./use-taste-tabs.tsx";

export const Library = (): ReactNode => {
  const marks = useMarks(Option.none());
  const taste = useTasteTabs();
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
    <div className="grid items-start gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2">
        <MarkList marks={marks} showSong onPick={pick} onRemove={remove} />
      </section>
      <aside className="lg:sticky lg:top-4">
        <TasteTabs tabs={taste} />
      </aside>
    </div>
  );
};
