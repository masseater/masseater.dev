import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { HEIGHT, WIDTH } from "./loading-cell-size.ts";
import { LoadingCell } from "./loading-cell.tsx";

const LABEL = "読み込み中";
const SIDE = 3;
const GAP = 3;
const VIEW_BOX = `0 0 ${SIDE * (WIDTH + GAP) - GAP} ${SIDE * (HEIGHT + GAP) - GAP}`;

const cells = Array.makeBy(SIDE * SIDE, (index) => ({
  index,
  left: (index % SIDE) * (WIDTH + GAP),
  top: Math.floor(index / SIDE) * (HEIGHT + GAP),
  step: (index % SIDE) + Math.floor(index / SIDE),
}));

export const MosaicLoading = (): ReactNode => (
  <div className="absolute inset-0 grid place-items-center">
    <progress aria-label={LABEL} className="sr-only" />
    <svg viewBox={VIEW_BOX} className="text-primary w-20" aria-hidden="true">
      {pipe(
        cells,
        Array.map((cell) => (
          <LoadingCell key={cell.index} left={cell.left} top={cell.top} step={cell.step} />
        )),
      )}
    </svg>
  </div>
);
