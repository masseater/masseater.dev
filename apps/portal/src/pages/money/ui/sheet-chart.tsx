import { Array as Arr, pipe } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import { YEN } from "#/entities/money";
import type { SheetBlock } from "#/pages/money/model/sheet";
import { SHEET_SERIES, sheetRow } from "#/pages/money/model/sheet-chart";

import { SheetBar } from "./sheet-bar";

const TEXT = { assets: "資産", liabilities: "負債・純資産" } as const;

const HEIGHT = 320;

const INITIAL = { width: 480, height: HEIGHT } as const;

const GAP = "4%";

const TICK = { fill: "var(--foreground)", fontSize: 12, fontWeight: 700 } as const;

const asYen = (value: unknown): string => YEN.format(Number(value));

export const SheetChart = ({
  left,
  right,
  title,
}: Readonly<{
  left: readonly SheetBlock[];
  right: readonly SheetBlock[];
  title: string;
}>): ReactNode => {
  const data = useMemo(
    () => [
      sheetRow({ blocks: left, side: TEXT.assets }),
      sheetRow({ blocks: right, side: TEXT.liabilities }),
    ],
    [left, right],
  );
  return (
    <ResponsiveContainer height={HEIGHT} initialDimension={INITIAL}>
      <BarChart barCategoryGap={GAP} data={data} desc={title}>
        <XAxis axisLine={false} dataKey="side" orientation="top" tick={TICK} tickLine={false} />
        <Tooltip formatter={asYen} />
        {pipe(
          SHEET_SERIES,
          Arr.map((series) => <SheetBar key={series.tone} series={series} />),
        )}
      </BarChart>
    </ResponsiveContainer>
  );
};
