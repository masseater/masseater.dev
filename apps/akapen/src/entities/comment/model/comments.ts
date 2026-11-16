import { useAtomValue } from "@effect/atom-react";
import type { Comment } from "@masseater.dev/akapen-protocol";
import type { Media } from "@masseater.dev/media-notes-protocol";
import { keyOf, runtime } from "@masseater.dev/media-notes-ui";
import { Array as Arr, Option, pipe } from "effect";
import { AsyncResult } from "effect/reactivity";

import { fetchComments } from "#/shared/api/index.ts";

/** @internal */
export const commentsAtom = runtime.atom(fetchComments);

const ofMedia =
  (media: Option.Option<Media>) =>
  (comment: Comment): boolean =>
    Option.match(media, {
      onNone: () => true,
      onSome: ({ source }) => keyOf(source) === keyOf(comment.media.source),
    });

export const useComments = (media: Option.Option<Media>): readonly Comment[] =>
  pipe(AsyncResult.getOrElse(useAtomValue(commentsAtom), Arr.empty), Arr.filter(ofMedia(media)));
