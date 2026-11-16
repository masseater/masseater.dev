import { useAtom, useAtomValue } from "@effect/atom-react";
import { openedAtom, useJump, usePlayer } from "@masseater.dev/media-notes-ui";
import { Equal, Option, pipe } from "effect";
import { useEffect } from "react";

import { pendingAtom } from "./pending.ts";
import { sameMedia } from "./use-play-clip.ts";

export const usePendingClip = (): void => {
  const [pending, setPending] = useAtom(pendingAtom);
  const opened = useAtomValue(openedAtom);
  const player = usePlayer();
  const jump = useJump();
  useEffect(() => {
    const arrived = pipe(
      pending,
      Option.filter(
        ({ clip, before }) =>
          Option.isSome(player) &&
          !Equal.equals(before, player) &&
          Option.exists(opened, ({ media }) => sameMedia(media)(clip.media)),
      ),
    );
    if (Option.isSome(arrived)) {
      setPending(Option.none());
      jump(arrived.value.clip);
    }
  }, [pending, opened, player, jump, setPending]);
};
