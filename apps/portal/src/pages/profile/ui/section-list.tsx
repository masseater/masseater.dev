import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { ProfileSectionValue } from "#/entities/watashi/index.ts";

import { SectionBlock } from "./section-block.tsx";

const EMPTY = "まだ作られていない";

const blocksOf = (sections: readonly ProfileSectionValue[]): ReactNode =>
  pipe(
    sections,
    Arr.map((section) => <SectionBlock key={section.title} section={section} />),
  );

export const SectionList = ({
  sections,
}: Readonly<{ sections: readonly ProfileSectionValue[] }>): ReactNode =>
  Arr.match(sections, {
    onEmpty: () => <p className="text-muted-foreground text-sm">{EMPTY}</p>,
    onNonEmpty: blocksOf,
  });
