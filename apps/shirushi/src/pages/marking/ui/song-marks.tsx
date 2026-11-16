import { useAtomSet } from "@effect/atom-react";
import type { Media } from "@masseater.dev/media-notes-protocol";
import { useJump } from "@masseater.dev/media-notes-ui";
import { Option } from "effect";
import type { ReactNode } from "react";

import { MarkList, removeAtom, useMarks } from "#/entities/mark/index.ts";

export const SongMarks = ({ media }: Readonly<{ media: Media }>): ReactNode => {
  const marks = useMarks(Option.some(media));
  const remove = useAtomSet(removeAtom);
  const pick = useJump();
  return <MarkList marks={marks} showSong={false} onPick={pick} onRemove={remove} />;
};
