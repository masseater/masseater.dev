import type { Media } from "@masseater.dev/media-notes-protocol";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { MediaMeta } from "#/entities/media/index.ts";
import {
  KeyHints,
  MediaPlayer,
  usePlayKey,
  usePlayer,
  usePosition,
} from "#/features/play-media/index.ts";
import { Timeline, useRangeKey } from "#/features/select-range/index.ts";
import type { Span } from "#/features/select-range/index.ts";

export const MediaStage = ({
  media,
  spans,
}: Readonly<{ media: Media; spans: readonly Span[] }>): ReactNode => {
  const player = usePlayer();
  const position = usePosition();
  useRangeKey(player);
  usePlayKey(player);
  const seek = useCallback(
    (seconds: number) => {
      if (Option.isSome(player)) {
        player.value.seek(seconds);
      }
    },
    [player],
  );
  return (
    <section className="grid content-start gap-3 lg:col-span-2">
      <MediaMeta media={media} duration={position.duration} />
      <MediaPlayer />
      <Timeline position={position} spans={spans} seek={seek} />
      <KeyHints />
    </section>
  );
};
