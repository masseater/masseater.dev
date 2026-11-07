import type { ReactNode } from "react";

import type { PartRow } from "#/entities/catalog/lib/part";

import { PartQuote } from "./part-quote";
import { PartTitle } from "./part-title";

const PartMaterial = ({ part }: Readonly<{ part: PartRow }>): ReactNode => (
  <span className="flex min-w-0 flex-col gap-1">
    <PartTitle song={part.song} label={part.label} />
    <PartQuote video={part.refVideo} />
  </span>
);

export { PartMaterial };
