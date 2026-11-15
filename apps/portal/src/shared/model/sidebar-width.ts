import { Number as Num } from "effect";

export const DEFAULT_SIDEBAR_WIDTH = 256;

const MIN_WIDTH = 200;

const MAX_WIDTH = 480;

export const sidebarWidthOf = (width: number): number => {
  if (!Number.isFinite(width)) {
    return DEFAULT_SIDEBAR_WIDTH;
  }
  return Math.round(Num.clamp(width, { minimum: MIN_WIDTH, maximum: MAX_WIDTH }));
};

export const sidebarWidthRule = (width: number): string =>
  `:root{--spacing-sidebar:${String(sidebarWidthOf(width))}px}`;
