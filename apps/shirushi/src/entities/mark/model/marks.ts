import { useAtomValue } from "@effect/atom-react";
import type { Media } from "@masseater.dev/media-notes-protocol";
import { keyOf, runtime } from "@masseater.dev/media-notes-ui";
import type { Mark } from "@masseater.dev/shirushi-protocol";
import { Array as Arr, Option, pipe } from "effect";
import { AsyncResult } from "effect/reactivity";

import { fetchMarks } from "#/shared/api/index.ts";

/** @internal */
export const marksAtom = runtime.atom(fetchMarks);

const ofMedia =
  (media: Option.Option<Media>) =>
  (mark: Mark): boolean =>
    Option.match(media, {
      onNone: () => true,
      onSome: ({ source }) => keyOf(source) === keyOf(mark.song.source),
    });

export const useMarks = (media: Option.Option<Media>): readonly Mark[] =>
  pipe(AsyncResult.getOrElse(useAtomValue(marksAtom), Arr.empty), Arr.filter(ofMedia(media)));
