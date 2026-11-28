import type { ReactNode } from "react";

import type { Item } from "#/pages/sashi/model/shelf.ts";

import { ReferenceFacts } from "./reference-facts.tsx";
import { ReferenceTitle } from "./reference-title.tsx";

export const ReferenceItem = ({ item }: Readonly<{ item: Item }>): ReactNode => (
  <li className="border-foreground/10 flex flex-col gap-2 border-t py-5 sm:flex-row sm:items-baseline sm:gap-8">
    <ReferenceTitle item={item} />
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-foreground/70 text-sm">{item.note}</p>
      <ReferenceFacts item={item} />
    </div>
  </li>
);
