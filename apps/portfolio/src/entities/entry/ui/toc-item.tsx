import type { Heading } from "@masseater.dev/sloppedia";
import type { ReactNode } from "react";

const ITEM_CLASS = {
  section: "",
  subsection: "ps-4",
} as const;

export const TocItem = ({ heading }: Readonly<{ heading: Heading }>): ReactNode => (
  <li className={ITEM_CLASS[heading.level]}>
    <a
      className="text-foreground/60 hover:text-foreground focus-visible:text-foreground transition-colors"
      href={`#${heading.id}`}
    >
      {heading.value}
    </a>
  </li>
);
