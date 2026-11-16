import { clock } from "@masseater.dev/media-notes-ui";
import type { Clip } from "@masseater.dev/shirushi-protocol";
import { Play } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useCanPlay, usePlayClip } from "#/features/choose-pair/model/use-play-clip.ts";

export const ClipButton = ({ name, clip }: Readonly<{ name: string; clip: Clip }>): ReactNode => {
  const play = usePlayClip();
  const playable = useCanPlay(clip);
  const start = useCallback(() => {
    play(clip);
  }, [play, clip]);
  return (
    <button
      type="button"
      disabled={!playable}
      className="hover:bg-accent focus-visible:ring-ring/50 grid min-w-0 gap-0.5 rounded-md border px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-3 disabled:opacity-50"
      onClick={start}
    >
      <span className="flex items-center gap-1.5 font-medium">
        <Play className="size-3.5" />
        {name}
      </span>
      <span className="truncate text-xs">{clip.media.title}</span>
      <span className="text-muted-foreground font-mono text-xs tabular-nums">
        {`${clock(clip.from)}–${clock(clip.to)}`}
      </span>
    </button>
  );
};
