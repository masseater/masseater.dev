import type { ReactNode } from "react";

import { useDanmakuPlayback, useToggleDanmaku } from "#/pages/home/model/danmaku-playback.ts";

const CONTROL = {
  playing: { mark: "❚❚", label: "弾幕を止める" },
  paused: { mark: "▶", label: "弾幕を流す" },
} as const;

export const SeekBar = (): ReactNode => {
  const control = CONTROL[useDanmakuPlayback()];
  const toggle = useToggleDanmaku();
  return (
    <div className="bg-screen text-muted-foreground relative flex items-center gap-3 border-t px-4 py-2 text-xs">
      <button
        type="button"
        onClick={toggle}
        aria-label={control.label}
        className="hover:text-foreground -m-1.5 flex size-6 items-center justify-center rounded-full transition-colors"
      >
        <span aria-hidden="true">{control.mark}</span>
      </button>
      <span aria-hidden="true" className="bg-secondary h-1.5 flex-1 rounded-full">
        <span className="bg-primary block h-full w-3/5 rounded-full" />
      </span>
    </div>
  );
};
