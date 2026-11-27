import type { ReactNode } from "react";

import type { Segment } from "#/entities/script/index.ts";

import { Stressed } from "./stressed.tsx";

export const CaptionSegment = ({
  segment,
  at,
  frame,
}: Readonly<{ segment: Segment; at: number; frame: number }>): ReactNode => {
  if (segment.code) {
    return <span className="font-code font-medium">{segment.text}</span>;
  }
  if (segment.emphasis) {
    return <Stressed at={at} frame={frame} text={segment.text} />;
  }
  return <span>{segment.text}</span>;
};
