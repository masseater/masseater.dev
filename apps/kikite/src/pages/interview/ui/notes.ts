type Note = Readonly<{ key: "points" | "open"; label: string; empty: string }>;

const POINTS: Note = { key: "points", label: "整理", empty: "話した内容をここにまとめます" };
const OPEN: Note = { key: "open", label: "気になること", empty: "" };

export { OPEN, POINTS };
export type { Note };
