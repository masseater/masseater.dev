import { useAtomRefresh } from "@effect/atom-react";
import { useFollowing as useEvent } from "@masseater.dev/media-notes-ui";

import { commentsAtom } from "./comments.ts";

const CHANGED = "akapen://comments-changed";

export const useFollowing = (): void => {
  useEvent({ event: CHANGED, refresh: useAtomRefresh(commentsAtom) });
};
