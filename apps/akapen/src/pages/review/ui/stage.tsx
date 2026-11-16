import type { Comment } from "@masseater.dev/akapen-protocol";
import type { Media } from "@masseater.dev/media-notes-protocol";
import { MediaStage } from "@masseater.dev/media-notes-ui";
import type { Span } from "@masseater.dev/media-notes-ui";
import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { useComments } from "#/entities/comment/index.ts";

const spanOf = (comment: Comment): Span => ({
  key: comment.id,
  from: comment.from,
  to: comment.to,
  tone: Option.match(Option.fromNullishOr(comment.resolution), {
    onNone: () => "plain",
    onSome: () => "faint",
  }),
});

export const Stage = ({ media }: Readonly<{ media: Media }>): ReactNode => {
  const spans = pipe(useComments(Option.some(media)), Arr.map(spanOf));
  return <MediaStage media={media} spans={spans} />;
};
