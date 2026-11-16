import { RegistryProvider, useAtomSet, useAtomValue } from "@effect/atom-react";
import { useMutation } from "@tanstack/react-query";
import { Atom } from "effect/reactivity";
import { createElement, useCallback } from "react";
import type { ReactNode } from "react";

import { saveSidebarOpen } from "#/shared/api/index.ts";

const DESKTOP = "(min-width: 48rem)";

export type SidebarState = "expanded" | "collapsed";

const sidebarOpenAtom = Atom.make(true);

const mobileOpenAtom = Atom.make(false);

export const sidebarRegistry = ({
  children,
  open,
}: Readonly<{ children: ReactNode; open: boolean }>): ReactNode =>
  createElement(RegistryProvider, { initialValues: [[sidebarOpenAtom, open]] }, children);

export const useSidebarOpen = (): boolean => useAtomValue(sidebarOpenAtom);

export const useSidebarState = (): SidebarState => {
  if (useSidebarOpen()) {
    return "expanded";
  }
  return "collapsed";
};

export const useMobileOpen = (): boolean => useAtomValue(mobileOpenAtom);

export const useSetMobileOpen = (): ((open: boolean) => void) => useAtomSet(mobileOpenAtom);

export const useToggleSidebar = (): (() => void) => {
  const open = useSidebarOpen();
  const setOpen = useAtomSet(sidebarOpenAtom);
  const setMobileOpen = useSetMobileOpen();
  const { mutate: save } = useMutation({
    mutationFn: (data: boolean) => saveSidebarOpen({ data }),
  });
  return useCallback(() => {
    if (globalThis.matchMedia(DESKTOP).matches) {
      setOpen(!open);
      save(!open);
      return;
    }
    setMobileOpen(true);
  }, [open, save, setMobileOpen, setOpen]);
};
