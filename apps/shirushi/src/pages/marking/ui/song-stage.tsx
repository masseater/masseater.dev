import type { Media } from "@masseater.dev/media-notes-protocol";
import {
  KeyHints,
  MediaMeta,
  MediaPlayer,
  Timeline,
  usePlayKey,
  usePlayer,
  usePosition,
  useRangeKey,
} from "@masseater.dev/media-notes-ui";
import type { Span, Tone } from "@masseater.dev/media-notes-ui";
import type { Mark, Verb } from "@masseater.dev/shirushi-protocol";
import { Array as Arr, Option, pipe } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useMarks } from "#/entities/mark";

const TONES: Readonly<Record<Verb, Tone>> = { like: "plain", dislike: "warn" };

const spanOf = (mark: Mark): Span => ({
  key: mark.id,
  from: mark.from,
  to: mark.to,
  tone: TONES[mark.verb],
});

export const SongStage = ({ media }: Readonly<{ media: Media }>): ReactNode => {
  const player = usePlayer();
  const position = usePosition();
  const spans = pipe(useMarks(Option.some(media)), Arr.map(spanOf));
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
