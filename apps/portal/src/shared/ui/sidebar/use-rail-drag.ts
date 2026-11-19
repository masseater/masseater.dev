import { useMutation } from "@tanstack/react-query";
import { Option, pipe } from "effect";
import { useCallback } from "react";

import { saveSidebarWidth } from "#/shared/api/index.ts";
import { DEFAULT_SIDEBAR_WIDTH, sidebarWidthOf } from "#/shared/model/index.ts";

import { useSidebarOpen, useToggleSidebar } from "./sidebar-state.ts";

const WIDTH_VARIABLE = "--spacing-sidebar";

const RESIZING = "data-sidebar-resizing";

const CONTAINER = '[data-slot="sidebar-container"]';

const CLICK_SLOP = 3;

const PRIMARY = 0;

export type Pointer = Readonly<{ clientX: number }>;

export type Press = Pointer & Readonly<{ button: number }>;

interface Drag {
  width: number;
  moved: boolean;
}

const currentWidth = (): number =>
  pipe(
    Option.fromNullishOr(document.querySelector(CONTAINER)),
    Option.map((element) => element.getBoundingClientRect().width),
    Option.getOrElse(() => DEFAULT_SIDEBAR_WIDTH),
  );

const applyWidth = (width: number): void => {
  document.documentElement.style.setProperty(WIDTH_VARIABLE, `${String(width)}px`);
};

const RELEASED = "pointerup";

const listenUntilRelease = ({
  onMove,
  onRelease,
}: Readonly<{ onMove: (move: Pointer) => void; onRelease: (type: string) => void }>): void => {
  const listening = new AbortController();
  const options = { signal: listening.signal };
  const release = (event: Readonly<{ type: string }>): void => {
    listening.abort();
    onRelease(event.type);
  };
  globalThis.addEventListener("pointermove", onMove, options);
  globalThis.addEventListener(RELEASED, release, options);
  globalThis.addEventListener("pointercancel", release, options);
};

export const useRailDrag = (): ((press: Press) => void) => {
  const open = useSidebarOpen();
  const toggle = useToggleSidebar();
  const { mutate: save } = useMutation({
    mutationFn: (data: number) => saveSidebarWidth({ data }),
  });
  return useCallback(
    (press: Press) => {
      if (press.button !== PRIMARY) {
        return;
      }
      const startWidth = currentWidth();
      const drag: Drag = { width: startWidth, moved: false };
      const root = document.documentElement;
      root.setAttribute(RESIZING, "");
      listenUntilRelease({
        onMove: (move) => {
          const delta = move.clientX - press.clientX;
          if (Math.abs(delta) > CLICK_SLOP) {
            drag.moved = true;
          }
          if (!open || !drag.moved) {
            return;
          }
          drag.width = sidebarWidthOf(startWidth + delta);
          applyWidth(drag.width);
        },
        onRelease: (type) => {
          root.removeAttribute(RESIZING);
          if (drag.moved) {
            if (open) {
              save(drag.width);
            }
            return;
          }
          if (type === RELEASED) {
            toggle();
          }
        },
      });
    },
    [open, save, toggle],
  );
};
