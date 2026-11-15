import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { sectionId } from "#/entities/watashi";
import type { ProfileSectionValue } from "#/entities/watashi";

const TEXT = { label: "目次" } as const;

export const SectionToc = ({
  sections,
}: Readonly<{ sections: readonly ProfileSectionValue[] }>): ReactNode => (
  <nav aria-label={TEXT.label} className="flex flex-col gap-1">
    <p className="text-muted-foreground px-3 text-xs font-bold">{TEXT.label}</p>
    {pipe(
      sections,
      Arr.map((section) => (
        <a
          className="hover:bg-accent rounded-md px-3 py-1 text-sm"
          href={`#${sectionId(section.title)}`}
          key={section.title}
        >
          {section.title}
        </a>
      )),
    )}
  </nav>
);
