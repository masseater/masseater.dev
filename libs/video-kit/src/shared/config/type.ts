import type { Format } from "./formats.ts";

export const FIT: Readonly<
  Record<Format, Readonly<Record<"name" | "title" | "heading" | "item", number>>>
> = {
  vertical: { name: 230, title: 124, heading: 124, item: 64 },
  horizontal: { name: 200, title: 120, heading: 104, item: 46 },
};
export const FIT_FLOOR = 0.5;
