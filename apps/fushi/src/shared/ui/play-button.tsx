import { Button } from "@masseater.dev/ui/button";
import { Option } from "effect";
import { Play, Square } from "lucide-react";
import type { ReactNode } from "react";

import { LABELS } from "#/shared/config/index.ts";
import type { ClipControls } from "#/shared/lib/index.ts";

const labelOf = (playing: boolean): string => {
  if (playing) {
    return LABELS.stop;
  }
  return LABELS.play;
};

export const PlayButton = ({ controls }: Readonly<{ controls: ClipControls }>): ReactNode => {
  const playing = Option.isSome(controls.fraction);
  const { toggle: handleToggle } = controls;
  return (
    <Button variant="outline" size="icon-xs" aria-label={labelOf(playing)} onClick={handleToggle}>
      {playing && <Square />}
      {!playing && <Play />}
    </Button>
  );
};
