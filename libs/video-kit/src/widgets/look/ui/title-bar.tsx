import type { ReactNode } from "react";

import { segmentsOf } from "#/shared/lib/segment.ts";
import { RichText } from "#/shared/ui/rich-text.tsx";

const FULL_MARK = 1;

export const TitleBar = ({
  text,
  className = "bar-dark",
}: Readonly<{ text: string; className?: string }>): ReactNode => (
  <div
    className={`font-jp japanese absolute inset-x-0 top-0 flex flex-col items-center justify-center px-8 pt-24 pb-8 text-center leading-tight font-black ${className}`}
  >
    <RichText mark={FULL_MARK} segments={segmentsOf(text)} tone="color" />
  </div>
);
