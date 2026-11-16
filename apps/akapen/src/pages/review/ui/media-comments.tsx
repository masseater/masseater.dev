import { useAtomSet } from "@effect/atom-react";
import type { Media } from "@masseater.dev/media-notes-protocol";
import { useJump } from "@masseater.dev/media-notes-ui";
import { Option } from "effect";
import type { ReactNode } from "react";

import { CommentList, RemovedNotice, removeAtom, useComments } from "#/entities/comment";

export const MediaComments = ({ media }: Readonly<{ media: Media }>): ReactNode => {
  const comments = useComments(Option.some(media));
  const remove = useAtomSet(removeAtom);
  const pick = useJump();
  return (
    <div className="grid gap-2">
      <CommentList comments={comments} onPick={pick} onRemove={remove} />
      <RemovedNotice />
    </div>
  );
};
