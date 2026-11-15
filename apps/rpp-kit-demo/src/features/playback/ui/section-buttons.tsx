import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { song } from "#/entities/song/index.ts";

import { SectionButton } from "./section-button";

export const SectionButtons = (): ReactNode => (
  <div className="flex flex-wrap gap-1">
    {pipe(
      song.sections,
      Arr.map((section) => <SectionButton key={section.start} section={section} />),
    )}
  </div>
);
