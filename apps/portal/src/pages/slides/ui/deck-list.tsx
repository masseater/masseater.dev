import type { Option } from "effect";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { withTag } from "#/entities/slide/index.ts";
import { TagFilter } from "#/features/filter-decks/index.ts";
import { useDecks } from "#/pages/slides/api/slides-query.ts";
import { RowList } from "#/shared/ui/index.ts";

import { DeckRow } from "./deck-row";

const LABEL = "デッキ";

export const DeckList = ({ tag }: Readonly<{ tag: Option.Option<string> }>): ReactNode => {
  const decks = useDecks();
  return (
    <div className="flex flex-col gap-6">
      <TagFilter decks={decks} tag={tag} />
      <RowList label={LABEL}>
        {pipe(
          decks,
          withTag(tag),
          Arr.map((deck) => <DeckRow deck={deck} key={deck.file} />),
        )}
      </RowList>
    </div>
  );
};
