import type { Mark } from "@masseater.dev/shirushi-protocol";
import type { ReactNode } from "react";

import { MarkLine } from "./mark-line.tsx";
import { MarkStill } from "./mark-still.tsx";

export const MarkLabel = ({
  mark,
  showSong,
}: Readonly<{ mark: Mark; showSong: boolean }>): ReactNode => (
  <span className="flex items-center gap-2">
    {mark.song.source.site === "file" && <MarkStill id={mark.id} />}
    <span className="grid min-w-0 flex-1">
      <MarkLine mark={mark} />
      {showSong && (
        <span className="text-muted-foreground block truncate pl-10 text-xs">
          {mark.song.title}
        </span>
      )}
    </span>
  </span>
);
