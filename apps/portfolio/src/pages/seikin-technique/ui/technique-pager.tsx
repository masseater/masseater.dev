import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { techniqueList } from "#/entities/technique";
import type { Technique } from "#/entities/technique";
import { NEXT_LABEL, PREVIOUS_LABEL } from "#/pages/seikin-technique/model/copy";

import { PagerLink } from "./pager-link";

const PREVIOUS = -1;
const NEXT = 1;

const neighbor = (slug: string, offset: number): Option.Option<Technique> =>
  pipe(
    techniqueList,
    Arr.findFirstIndex((technique) => technique.slug === slug),
    Option.flatMap((index) => Arr.get(techniqueList, index + offset)),
  );

const TechniquePager = ({ slug }: Readonly<{ slug: string }>): ReactNode => (
  <nav className="flex justify-between gap-4 border-t pt-6">
    <PagerLink label={PREVIOUS_LABEL} technique={neighbor(slug, PREVIOUS)} />
    <PagerLink label={NEXT_LABEL} technique={neighbor(slug, NEXT)} />
  </nav>
);

export { TechniquePager };
