import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Heading } from "#/entities/entry/model/toc";

import { TocItem } from "./toc-item";

const TocList = ({ headings }: Readonly<{ headings: readonly Heading[] }>): ReactNode => (
  <ol className="flex flex-col gap-2">
    {pipe(
      headings,
      Arr.map((heading) => <TocItem heading={heading} key={heading.id} />),
    )}
  </ol>
);

export { TocList };
