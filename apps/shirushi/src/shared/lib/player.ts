import type { Source } from "#protocol";

export type Position = Readonly<{ current: number; duration: number }>;

export type Player = Readonly<{
  time: () => Position;
  seek: (seconds: number) => void;
  toggle: () => void;
}>;

export type Mount = Readonly<{ stage: HTMLElement; source: Source }>;

export const STILL: Position = { current: 0, duration: 0 };
