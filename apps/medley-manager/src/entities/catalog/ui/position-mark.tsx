import { Array, Option } from "effect";
import type { ReactNode } from "react";

const MARK_COLORS: readonly string[] = [
  "bg-comment-pink",
  "bg-comment-yellow",
  "bg-comment-cyan",
  "bg-comment-green",
  "bg-comment-orange",
  "bg-comment-purple",
];

const markColor = (position: number): string =>
  Option.getOrElse(Array.get(MARK_COLORS, position % MARK_COLORS.length), () => "bg-comment-pink");

const PositionMark = ({ position }: Readonly<{ position: number }>): ReactNode => (
  <span
    className={`font-display text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm ${markColor(position)}`}
  >
    {position}
  </span>
);

export { PositionMark };
