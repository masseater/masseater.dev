import { useEffect } from "react";
import type { ReactNode } from "react";

import { useToggleSidebar } from "./sidebar-state.ts";

const KEY = "b";

export const SidebarShortcut = (): ReactNode => {
  const toggle = useToggleSidebar();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== KEY || !(event.metaKey || event.ctrlKey)) {
        return;
      }
      event.preventDefault();
      toggle();
    };
    globalThis.addEventListener("keydown", onKeyDown);
    return (): void => {
      globalThis.removeEventListener("keydown", onKeyDown);
    };
  }, [toggle]);
  return false;
};
