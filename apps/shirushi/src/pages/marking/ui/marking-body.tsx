import { useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import type { ReactNode } from "react";

import { songAtom } from "#/entities/song";

import { Library } from "./library.tsx";
import { Workspace } from "./workspace.tsx";

export const MarkingBody = (): ReactNode => {
  const song = useAtomValue(songAtom);
  if (Option.isSome(song)) {
    return <Workspace song={song.value} />;
  }
  return <Library />;
};
