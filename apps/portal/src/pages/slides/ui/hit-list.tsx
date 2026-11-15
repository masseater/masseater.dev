import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { HitRow } from "#/entities/slide";
import { useHits } from "#/pages/slides/api/slides-query";
import { RowList } from "#/shared/ui";

const LABEL = "見つかったスライド";

export const HitList = ({ keyword }: Readonly<{ keyword: string }>): ReactNode => (
  <RowList label={LABEL}>
    {pipe(
      useHits(keyword),
      Arr.map((hit) => <HitRow hit={hit} key={`${hit.deck}#${String(hit.page)}`} />),
    )}
  </RowList>
);
