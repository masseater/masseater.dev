import type { Panel } from "#/entities/interview/index.ts";

export type Note = Readonly<{
  key: Extract<Panel, "points" | "open">;
  label: string;
  empty: string;
}>;

export const POINTS: Note = { key: "points", label: "整理", empty: "話した内容をここにまとめます" };
export const OPEN: Note = { key: "open", label: "気になること", empty: "" };
