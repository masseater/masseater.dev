import type { ReactNode } from "react";

import type { PartRow } from "#/entities/part/lib/part.ts";

import { PartQuote } from "./part-quote.tsx";
import { PartTitle } from "./part-title.tsx";

export const PartMaterial = ({ part }: Readonly<{ part: PartRow }>): ReactNode => (
  <span className="flex min-w-0 flex-col gap-1">
    <PartTitle song={part.song} label={part.label} />
    <PartQuote video={part.refVideo} />
  </span>
);
