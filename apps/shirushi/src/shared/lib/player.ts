import type { Source } from "#/shared/api/index.ts";

export type Position = Readonly<{ current: number; duration: number }>;

export type Player = Readonly<{
  time: () => Position;
  seek: (seconds: number) => void;
  toggle: () => void;
}>;

export type Mount = Readonly<{ stage: HTMLElement; source: Source }>;

export const STILL: Position = { current: 0, duration: 0 };
