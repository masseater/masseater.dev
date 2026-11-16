import { Number as Num, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { YEN } from "#/entities/money/index.ts";

type SheetLabelProps = Readonly<{
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: unknown;
  title: string;
}>;

const NONE = 0;

const HALF = 2;

const TWO_LINES = 40;

const ONE_LINE = 20;

const LINE = 8;

const numberOf = (value: unknown): number =>
  pipe(
    Num.parse(String(value)),
    Option.getOrElse(() => NONE),
  );

export const SheetLabel = ({ height, title, value, width, x, y }: SheetLabelProps): ReactNode => {
  const box = { x: numberOf(x), y: numberOf(y), width: numberOf(width), height: numberOf(height) };
  const amount = numberOf(value);
  if (amount <= NONE || box.height < ONE_LINE) {
    return false;
  }
  const center = { x: box.x + box.width / HALF, y: box.y + box.height / HALF };
  if (box.height < TWO_LINES) {
    return (
      <text
        className="fill-foreground text-xs font-bold"
        dominantBaseline="middle"
        textAnchor="middle"
        x={center.x}
        y={center.y}
      >
        {title}
      </text>
    );
  }
  return (
    <text
      className="fill-foreground text-xs"
      dominantBaseline="middle"
      textAnchor="middle"
      x={center.x}
      y={center.y}
    >
      <tspan className="font-bold" dy={-LINE} x={center.x}>
        {title}
      </tspan>
      <tspan className="tabular-nums" dy={LINE * HALF} x={center.x}>
        {YEN.format(amount)}
      </tspan>
    </text>
  );
};
