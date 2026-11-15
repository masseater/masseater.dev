import { useMutation } from "@tanstack/react-query";
import { Option, pipe } from "effect";
import { useCallback } from "react";

import { saveSidebarWidth } from "#/shared/api";
import { DEFAULT_SIDEBAR_WIDTH, sidebarWidthOf } from "#/shared/model";

import { useSidebarOpen, useToggleSidebar } from "./sidebar-state";

const WIDTH_VARIABLE = "--spacing-sidebar";

const RESIZING = "data-sidebar-resizing";

const CONTAINER = '[data-slot="sidebar-container"]';

const CLICK_SLOP = 3;

export type Pointer = Readonly<{ clientX: number }>;

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

export const useRailDrag = (): ((press: Pointer) => void) => {
  const open = useSidebarOpen();
  const toggle = useToggleSidebar();
  const { mutate: save } = useMutation({
    mutationFn: (data: number) => saveSidebarWidth({ data }),
  });
  return useCallback(
    (press: Pointer) => {
      const startWidth = currentWidth();
      const drag: Drag = { width: startWidth, moved: false };
      const root = document.documentElement;
      root.setAttribute(RESIZING, "");
      const onMove = (move: Pointer): void => {
        const delta = move.clientX - press.clientX;
        if (Math.abs(delta) > CLICK_SLOP) {
          drag.moved = true;
        }
        if (!open || !drag.moved) {
          return;
        }
        drag.width = sidebarWidthOf(startWidth + delta);
        applyWidth(drag.width);
      };
      const onUp = (): void => {
        globalThis.removeEventListener("pointermove", onMove);
        root.removeAttribute(RESIZING);
        if (!drag.moved) {
          toggle();
          return;
        }
        if (open) {
          save(drag.width);
        }
      };
      globalThis.addEventListener("pointermove", onMove);
      globalThis.addEventListener("pointerup", onUp, { once: true });
    },
    [open, save, toggle],
  );
};
