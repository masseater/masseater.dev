import { Option } from "effect";
import type { ReactNode } from "react";

import type { SlidesSearchValue } from "#/entities/slide/index.ts";
import { wanted } from "#/pages/slides/api/slides-query.ts";

import { DeckList } from "./deck-list";
import { HitList } from "./hit-list";

export const SlidesResults = ({ search }: Readonly<{ search: SlidesSearchValue }>): ReactNode =>
  Option.match(wanted(search), {
    onNone: () => <DeckList tag={Option.fromUndefinedOr(search.tag)} />,
    onSome: (keyword) => <HitList keyword={keyword} />,
  });
