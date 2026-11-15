import type { Panel } from "#/entities/interview";

type PanelLabel = Readonly<{ id: Panel; label: string }>;

const PANELS: readonly PanelLabel[] = [
  { id: "points", label: "整理" },
  { id: "open", label: "気になること" },
  { id: "transcript", label: "文字起こし" },
];

export { PANELS };
export type { PanelLabel };
