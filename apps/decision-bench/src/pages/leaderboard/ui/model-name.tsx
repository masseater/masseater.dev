import type { ReactNode } from "react";

const SIZE = 10;
const HALF = 2;
const CENTER = SIZE / HALF;

const ModelName = ({ color, label }: Readonly<{ color: string; label: string }>): ReactNode => (
  <span className="inline-flex items-center gap-2">
    <svg aria-hidden="true" width={SIZE} height={SIZE} className="shrink-0">
      <circle cx={CENTER} cy={CENTER} r={CENTER} fill={color} />
    </svg>
    {label}
  </span>
);

export { ModelName };
