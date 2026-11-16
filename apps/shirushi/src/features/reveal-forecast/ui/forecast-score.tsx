import { useAtom } from "@effect/atom-react";
import type { Media } from "@masseater.dev/media-notes-protocol";
import { Button } from "@masseater.dev/ui/button";
import { Array as Arr } from "effect";
import { Eye } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useForecasts } from "#/entities/taste/index.ts";
import { revealedAtom } from "#/features/reveal-forecast/model/revealed.ts";
import { revealLabel, scoreOf } from "#/features/reveal-forecast/model/score.ts";

export const ForecastScore = ({ media }: Readonly<{ media: Media }>): ReactNode => {
  const forecasts = useForecasts(media);
  const [revealed, reveal] = useAtom(revealedAtom);
  const show = useCallback(() => {
    reveal(true);
  }, [reveal]);
  if (!Arr.isReadonlyArrayNonEmpty(forecasts)) {
    return false;
  }
  if (!revealed) {
    return (
      <Button variant="outline" size="sm" className="justify-self-start" onClick={show}>
        <Eye />
        {revealLabel(forecasts)}
      </Button>
    );
  }
  return <p className="text-muted-foreground text-xs tabular-nums">{scoreOf(forecasts)}</p>;
};
