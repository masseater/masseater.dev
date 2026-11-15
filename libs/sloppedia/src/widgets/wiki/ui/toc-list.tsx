import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { numbered } from "#/entities/article/index.ts";
import type { Heading } from "#/entities/article/index.ts";

import { TocItem } from "./toc-item.tsx";

export const TocList = ({ headings }: Readonly<{ headings: readonly Heading[] }>): ReactNode => (
  <ol className="flex flex-col gap-1 text-sm">
    {pipe(
      numbered(headings),
      Arr.map((heading) => <TocItem heading={heading} key={heading.id} />),
    )}
  </ol>
);
