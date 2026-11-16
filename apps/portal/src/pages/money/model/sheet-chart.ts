import { Array as Arr, Record as Rec, pipe } from "effect";

import type { BlockTone, SheetBlock } from "./sheet.ts";

export type SheetRow = Readonly<{ side: string } & Partial<Record<BlockTone, number>>>;

export type SheetSeries = Readonly<{
  tone: BlockTone;
  label: string;
  fill: string;
  stroke: string;
}>;

const NO_STROKE = "none";

export const SHEET_SERIES: readonly SheetSeries[] = [
  { tone: "debt-excess", label: "債務超過", fill: "var(--card)", stroke: "var(--expense-strong)" },
  { tone: "net-assets", label: "純資産", fill: "var(--net-assets)", stroke: NO_STROKE },
  { tone: "fixed-asset", label: "固定資産", fill: "var(--asset-fixed)", stroke: NO_STROKE },
  { tone: "fixed-liability", label: "固定負債", fill: "var(--liability-fixed)", stroke: NO_STROKE },
  { tone: "current-asset", label: "流動資産", fill: "var(--asset-current)", stroke: NO_STROKE },
  {
    tone: "current-liability",
    label: "流動負債",
    fill: "var(--liability-current)",
    stroke: NO_STROKE,
  },
];

export const sheetRow = ({
  blocks,
  side,
}: Readonly<{ blocks: readonly SheetBlock[]; side: string }>): SheetRow => ({
  side,
  ...pipe(
    blocks,
    Arr.map((block) => [block.tone, block.amount] as const),
    Rec.fromEntries,
  ),
});
