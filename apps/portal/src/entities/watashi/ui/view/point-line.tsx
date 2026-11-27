import type { ReactNode } from "react";

export type PointText = Readonly<{ theme: string; text: string; days: string }>;

export const PointLine = ({ days, text, theme }: PointText): ReactNode => (
  <span className="flex items-baseline gap-3">
    <b className="w-24 shrink-0 text-sm">{theme}</b>
    <span className="flex-1">{text}</span>
    <span className="text-muted-foreground text-xs">{days}</span>
  </span>
);
