import type { ReactNode } from "react";

import type { NumberedHeading } from "./headings.ts";

const ITEM_CLASS = {
  section: "",
  subsection: "ps-4",
} as const;

const TocItem = ({ heading }: Readonly<{ heading: NumberedHeading }>): ReactNode => (
  <li className={ITEM_CLASS[heading.level]}>
    <a className="text-wiki-link flex gap-2 hover:underline" href={`#${heading.id}`}>
      <span className="text-wiki-subtle">{heading.number}</span>
      <span>{heading.value}</span>
    </a>
  </li>
);

export { TocItem };
