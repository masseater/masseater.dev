import { Pause, Play } from "lucide-react";
import type { ReactNode } from "react";

export const PlayGlyph = ({ playing }: Readonly<{ playing: boolean }>): ReactNode => {
  if (playing) {
    return <Pause className="size-4" aria-hidden />;
  }
  return <Play className="size-4" aria-hidden />;
};
