import { Array as Arr, pipe } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

const MIDDLE = 50;

const THINNEST = 0.01;

const pathOf = (peaks: readonly number[]): string =>
  pipe(
    peaks,
    Arr.map((peak, index) => {
      const reach = Math.max(peak * MIDDLE, THINNEST);
      return `M${String(index)} ${String(MIDDLE - reach)}V${String(MIDDLE + reach)}`;
    }),
    Arr.join(""),
  );

export const Peaks = ({ peaks }: Readonly<{ peaks: readonly number[] }>): ReactNode => {
  const path = useMemo(() => pathOf(peaks), [peaks]);
  return <path d={path} vectorEffect="non-scaling-stroke" />;
};
