import type { Option } from "effect";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { withTag } from "#/entities/slide";
import { useDecks } from "#/pages/slides/api/slides-query";
import { RowList } from "#/shared/ui";

import { DeckRow } from "./deck-row";
import { TagFilter } from "./tag-filter";

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
