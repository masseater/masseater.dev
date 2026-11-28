import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Item } from "#/pages/sashi/model/shelf.ts";
import { TagList } from "#/shared/ui/index.ts";

export const ReferenceFacts = ({ item }: Readonly<{ item: Item }>): ReactNode => (
  <div className="font-display text-foreground/50 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs tracking-widest uppercase">
    <TagList tags={item.tags} />
    {pipe(
      item.facts,
      Arr.map((fact) => <span key={fact}>{fact}</span>),
    )}
  </div>
);
