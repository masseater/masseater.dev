import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useFoundSlides } from "#/pages/search/api/search-query";
import { RowList, Section } from "#/shared/ui";

import { FoundSlideRow } from "./found-slide-row";

const TITLE = "スライド";

export const FoundSlides = ({ keyword }: Readonly<{ keyword: string }>): ReactNode => {
  const hits = useFoundSlides(keyword);
  return (
    <Section meta={`${String(Arr.length(hits))} 件`} title={TITLE}>
      <RowList label={TITLE}>
        {pipe(
          hits,
          Arr.map((hit) => <FoundSlideRow hit={hit} key={`${hit.deck}#${String(hit.page)}`} />),
        )}
      </RowList>
    </Section>
  );
};
