import type { Opened } from "@masseater.dev/media-notes-protocol";

export type Position = Readonly<{ current: number; duration: number }>;

export type Player = Readonly<{
  time: () => Position;
  seek: (seconds: number) => void;
  toggle: () => void;
}>;

export type Mount = Readonly<{ stage: HTMLElement; opened: Opened }>;

export const STILL: Position = { current: 0, duration: 0 };
