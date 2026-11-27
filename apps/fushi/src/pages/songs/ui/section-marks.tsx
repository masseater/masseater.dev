import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Section } from "#/entities/song/index.ts";
import { LABELS } from "#/shared/config/index.ts";

import { LaneRow } from "./lane-row.tsx";
import { SectionMark } from "./section-mark.tsx";

export const SectionMarks = ({
  sections,
}: Readonly<{ sections: readonly Section[] }>): ReactNode => (
  <LaneRow label={LABELS.sections}>
    <svg viewBox="0 0 1000 24" className="w-full" aria-hidden>
      {pipe(
        sections,
        Arr.map((section) => (
          <SectionMark key={`${section.name}-${section.at}`} section={section} />
        )),
      )}
    </svg>
  </LaneRow>
);
