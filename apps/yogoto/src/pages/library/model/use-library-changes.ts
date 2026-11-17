import { useAtomRefresh } from "@effect/atom-react";
import { useFollowing } from "@masseater.dev/media-notes-ui";
import { useCallback } from "react";

import { jobsAtom } from "#/entities/job/index.ts";
import { songsAtom } from "#/entities/song/index.ts";

const CHANGED = "yogoto://changed";

export const useLibraryChanges = (): void => {
  const jobs = useAtomRefresh(jobsAtom);
  const songs = useAtomRefresh(songsAtom);
  const refresh = useCallback(() => {
    jobs();
    songs();
  }, [jobs, songs]);
  useFollowing({ event: CHANGED, refresh });
};
