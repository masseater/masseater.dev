import { useAtomSet } from "@effect/atom-react";
import { linkAtom, openFileAtom, openLinkAtom } from "@masseater.dev/media-notes-ui";
import { Array as Arr, Option, pipe } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useComments } from "#/entities/comment/index.ts";
import { shelvesOf } from "#/pages/review/model/shelf.ts";
import type { Shelf } from "#/pages/review/model/shelf.ts";

import { ShelfRow } from "./shelf-row.tsx";

export const Library = (): ReactNode => {
  const comments = useComments(Option.none());
  const shelves = shelvesOf(comments);
  const setLink = useAtomSet(linkAtom);
  const openLink = useAtomSet(openLinkAtom);
  const openFile = useAtomSet(openFileAtom);
  const open = useCallback(
    ({ latest }: Shelf) => {
      if (latest.media.source.site === "file") {
        openFile(latest.location);
        return;
      }
      setLink(latest.location);
      openLink(latest.location);
    },
    [openFile, openLink, setLink],
  );
  return (
    <ul className="grid max-w-3xl">
      {pipe(
        shelves,
        Arr.map((shelf) => <ShelfRow key={shelf.latest.id} shelf={shelf} onOpen={open} />),
      )}
    </ul>
  );
};
