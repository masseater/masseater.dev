import { useAtomSet } from "@effect/atom-react";
import type { Comment } from "@masseater.dev/akapen-protocol";
import type { Media } from "@masseater.dev/media-notes-protocol";
import { rangeAtom, usePlayer } from "@masseater.dev/media-notes-ui";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { CommentList, RemovedNotice, removeAtom, useComments } from "#/entities/comment";

export const MediaComments = ({ media }: Readonly<{ media: Media }>): ReactNode => {
  const comments = useComments(Option.some(media));
  const player = usePlayer();
  const setRange = useAtomSet(rangeAtom);
  const remove = useAtomSet(removeAtom);
  const pick = useCallback(
    ({ from, to }: Comment) => {
      setRange(Option.some({ from, to }));
      if (Option.isSome(player)) {
        player.value.seek(from);
      }
    },
    [player, setRange],
  );
  return (
    <div className="grid gap-2">
      <CommentList comments={comments} onPick={pick} onRemove={remove} />
      <RemovedNotice />
    </div>
  );
};
