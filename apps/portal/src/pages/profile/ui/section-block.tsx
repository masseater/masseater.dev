import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { sectionId } from "#/entities/watashi/index.ts";
import type { ProfileSectionValue } from "#/entities/watashi/index.ts";

import { LineItem } from "./line-item.tsx";

export const SectionBlock = ({
  section,
}: Readonly<{ section: ProfileSectionValue }>): ReactNode => (
  <section aria-labelledby={sectionId(section.title)} className="flex flex-col gap-2">
    <h2 className="text-std-18B-160 border-b pb-1" id={sectionId(section.title)}>
      {section.title}
    </h2>
    <ul className="flex flex-col gap-1.5">
      {pipe(
        section.lines,
        Arr.map((line) => <LineItem key={line.text} line={line} />),
      )}
    </ul>
  </section>
);
