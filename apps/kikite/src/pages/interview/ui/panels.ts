import type { Panel } from "#/pages/interview/model/hooks";

export type PanelLabel = Readonly<{ id: Panel; label: string }>;

export const PANELS: readonly PanelLabel[] = [
  { id: "points", label: "整理" },
  { id: "open", label: "気になること" },
  { id: "leads", label: "調べたこと" },
  { id: "transcript", label: "文字起こし" },
];
