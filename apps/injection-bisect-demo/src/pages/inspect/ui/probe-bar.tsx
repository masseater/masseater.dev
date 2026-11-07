import type { ReactNode } from "react";

import { toneOf } from "#/pages/inspect/model/overlay";
import type { Answer, Row } from "#/pages/inspect/model/trace";

import { BAR_CLASS } from "./tone";

const SCALE = 1000;

const BAR_HEIGHT = 10;

const MIN_WIDTH = 4;

const endOf = (answer: Answer, total: number): number => {
  if (answer.status === "answered") {
    return answer.answeredAt;
  }
  return total;
};

const ProbeBar = ({ row, total }: Readonly<{ row: Row; total: number }>): ReactNode => (
  <svg
    aria-hidden="true"
    className="bg-muted/50 h-2.5 min-w-0 flex-1 rounded-sm"
    viewBox={`0 0 ${SCALE} ${BAR_HEIGHT}`}
    preserveAspectRatio="none"
  >
    <rect
      className={BAR_CLASS[toneOf(row.answer)]}
      x={(row.askedAt / total) * SCALE}
      width={Math.max(((endOf(row.answer, total) - row.askedAt) / total) * SCALE, MIN_WIDTH)}
      height={BAR_HEIGHT}
    />
  </svg>
);

export { ProbeBar };
