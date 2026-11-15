import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

export type LegendItem = Readonly<{ label: string; swatch: string }>;

const LABEL = "凡例";

export const ChartLegend = ({ items }: Readonly<{ items: readonly LegendItem[] }>): ReactNode => (
  <ul aria-label={LABEL} className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
    {pipe(
      items,
      Arr.map((item) => (
        <li className="flex items-center gap-1.5" key={item.label}>
          <span aria-hidden className={item.swatch} />
          {item.label}
        </li>
      )),
    )}
  </ul>
);
