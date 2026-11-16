"use client";

import { useCallback } from "react";
import type { ReactNode } from "react";

import { useUpdateCascade } from "#/entities/entry/model/cascade-state.ts";
import { replayed } from "#/entities/entry/model/cascade.ts";

const REPLAY_LABEL = "連鎖を再生";

export const CascadeReplay = (): ReactNode => {
  const update = useUpdateCascade();
  const replay = useCallback(() => {
    update(replayed);
  }, [update]);
  return (
    <div className="mb-2 flex justify-end">
      <button
        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md px-2.5 py-1 text-xs"
        onClick={replay}
        type="button"
      >
        {REPLAY_LABEL}
      </button>
    </div>
  );
};
