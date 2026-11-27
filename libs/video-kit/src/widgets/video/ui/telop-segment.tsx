import type { ReactNode } from "react";

import type { Segment } from "#/shared/lib/segment.ts";

export const TelopSegment = ({
  segment,
  at,
  frame,
}: Readonly<{ segment: Segment; at: number; frame: number }>): ReactNode => {
  if (segment.code) {
    return <span className="font-code font-medium">{segment.text}</span>;
  }
  if (segment.emphasis && frame >= at) {
    return <span className="text-highlight">{segment.text}</span>;
  }
  return <span>{segment.text}</span>;
};
