import type { Media } from "@masseater.dev/media-notes-protocol";
import { MediaStage, usePlayer } from "@masseater.dev/media-notes-ui";
import type { Span } from "@masseater.dev/media-notes-ui";
import type { Mark } from "@masseater.dev/shirushi-protocol";
import { Array as Arr, Option, pipe } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { useMarks } from "#/entities/mark/index.ts";
import { usePendingClip } from "#/features/choose-pair/index.ts";
import { HOLD_HINTS, useHeldSpans, useHoldKeys } from "#/features/hold-to-mark/index.ts";
import { useForecastSpans, useRevealAtEnd } from "#/features/reveal-forecast/index.ts";
import { VERB_TONES } from "#/shared/config/index.ts";

const spanOf = (mark: Mark): Span => ({
  key: mark.id,
  from: mark.from,
  to: mark.to,
  tone: VERB_TONES[mark.verb],
});

export const SongStage = ({ media }: Readonly<{ media: Media }>): ReactNode => {
  useHoldKeys(usePlayer());
  usePendingClip();
  useRevealAtEnd();
  const marks = pipe(useMarks(Option.some(media)), Arr.map(spanOf));
  const held = useHeldSpans();
  const guesses = useForecastSpans(media);
  const spans = useMemo(() => [...guesses, ...marks, ...held], [guesses, marks, held]);
  return <MediaStage media={media} spans={spans} hints={HOLD_HINTS} />;
};
