import { useAtomSet, useAtomValue } from "@effect/atom-react";
import type { Media } from "@masseater.dev/media-notes-protocol";
import {
  keyOf,
  linkAtom,
  openedAtom,
  openLinkAtom,
  pageOf,
  useJump,
  usePlayer,
} from "@masseater.dev/media-notes-ui";
import type { Clip } from "@masseater.dev/shirushi-protocol";
import { Option } from "effect";
import { useCallback } from "react";

import { pendingAtom } from "./pending.ts";

export const sameMedia =
  (one: Media) =>
  (other: Media): boolean =>
    keyOf(one.source) === keyOf(other.source);

export const useCanPlay = (clip: Clip): boolean => {
  const opened = useAtomValue(openedAtom);
  return (
    Option.exists(opened, ({ media }) => sameMedia(media)(clip.media)) ||
    Option.isSome(pageOf(clip.media.source))
  );
};

export const usePlayClip = (): ((clip: Clip) => void) => {
  const opened = useAtomValue(openedAtom);
  const player = usePlayer();
  const jump = useJump();
  const setLink = useAtomSet(linkAtom);
  const open = useAtomSet(openLinkAtom);
  const setPending = useAtomSet(pendingAtom);
  return useCallback(
    (clip: Clip) => {
      if (Option.exists(opened, ({ media }) => sameMedia(media)(clip.media))) {
        jump(clip);
        return;
      }
      const page = pageOf(clip.media.source);
      if (Option.isSome(page)) {
        setPending(Option.some({ clip, before: player }));
        setLink(page.value);
        open(page.value);
      }
    },
    [opened, player, jump, setLink, open, setPending],
  );
};
