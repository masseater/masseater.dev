import { useAtomValue } from "@effect/atom-react";
import { openedAtom } from "@masseater.dev/media-notes-ui";
import { Option } from "effect";
import type { ReactNode } from "react";

import { Library } from "./library.tsx";
import { Workspace } from "./workspace.tsx";

export const MarkingBody = (): ReactNode => {
  const opened = useAtomValue(openedAtom);
  if (Option.isSome(opened)) {
    return <Workspace media={opened.value.media} />;
  }
  return <Library />;
};
