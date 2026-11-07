import type { ReactNode } from "react";

const PLAY_MARK = "▶";

const SeekBar = (): ReactNode => (
  <div
    aria-hidden="true"
    className="bg-screen text-muted-foreground relative flex items-center gap-3 border-t px-4 py-2 text-xs"
  >
    <span>{PLAY_MARK}</span>
    <span className="bg-secondary h-1.5 flex-1 rounded-full">
      <span className="bg-primary block h-full w-3/5 rounded-full" />
    </span>
  </div>
);

export { SeekBar };
