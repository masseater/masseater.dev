export type Note = Readonly<{ key: "points" | "open"; label: string; empty: string }>;

export const POINTS: Note = { key: "points", label: "整理", empty: "話した内容をここにまとめます" };
export const OPEN: Note = { key: "open", label: "気になること", empty: "" };
