import { useAtomValue } from "@effect/atom-react";
import type { Media } from "@masseater.dev/media-notes-protocol";
import type { Span } from "@masseater.dev/media-notes-ui";
import type { Forecast } from "@masseater.dev/shirushi-protocol";
import { Array as Arr, pipe } from "effect";

import { useForecasts } from "#/entities/taste/index.ts";
import { GUESS_TONES } from "#/shared/config/index.ts";

import { revealedAtom } from "./revealed.ts";

const spanOf = ({ prediction }: Forecast): Span => ({
  key: prediction.id,
  from: prediction.from,
  to: prediction.to,
  tone: GUESS_TONES[prediction.verb],
});

export const useForecastSpans = (media: Media): readonly Span[] => {
  const revealed = useAtomValue(revealedAtom);
  const forecasts = useForecasts(media);
  if (!revealed) {
    return Arr.empty();
  }
  return pipe(forecasts, Arr.map(spanOf));
};
