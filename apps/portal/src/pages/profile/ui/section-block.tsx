import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { sectionId, topicsOf } from "#/entities/watashi/index.ts";
import type { ProfileSectionValue } from "#/entities/watashi/index.ts";

import { LineList } from "./line-list.tsx";

export const SectionBlock = ({
  section,
}: Readonly<{ section: ProfileSectionValue }>): ReactNode => (
  <section aria-labelledby={sectionId(section.title)} className="flex flex-col gap-2">
    <h2 className="text-std-18B-160 border-b pb-1" id={sectionId(section.title)}>
      {section.title}
    </h2>
    <LineList lines={section.lines} />
    {pipe(
      topicsOf(section),
      Arr.map((topic) => (
        <div className="mt-2 flex flex-col gap-1.5" key={topic.title}>
          <h3 className="text-std-16B-170">{topic.title}</h3>
          <LineList lines={topic.lines} />
        </div>
      )),
    )}
  </section>
);
