import { Array as Arr, Option, Schema, String as Str, pipe } from "effect";

import { PERSONAL_ORIGIN } from "#/shared/config";

type PageRef = Readonly<{ deck: string; page: number }>;

const Deck = Schema.Struct({
  file: Schema.String,
  title: Schema.String,
  tags: Schema.Array(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

const Decks = Schema.Array(Deck);

const Hit = Schema.Struct({
  deck: Schema.String,
  title: Schema.String,
  page: Schema.Int,
  pages: Schema.Int,
  text: Schema.String,
  url: Schema.String,
  score: Schema.Finite,
});

const Hits = Schema.Array(Hit);

const SlidesSearch = Schema.Struct({
  keyword: Schema.optionalKey(Schema.String),
  tag: Schema.optionalKey(Schema.String),
});

const SearchQuery = Schema.Struct({ keyword: Schema.NonEmptyString });

type DeckValue = typeof Deck.Type;

type SlidesSearchValue = typeof SlidesSearch.Type;

type HitValue = typeof Hit.Type;

const EXCERPT = 160;

const START = 0;

const DAY_LENGTH = 10;

const deckUrl = (file: string): string => `${PERSONAL_ORIGIN}/decks/${file}.html`;

const pdfUrl = (file: string): string => `${PERSONAL_ORIGIN}/decks/${file}.pdf`;

const pageUrl = ({ deck, page }: PageRef): string => `${deckUrl(deck)}#${String(page)}`;

const dayOf = Str.slice(START, DAY_LENGTH);

const tagsOf = (decks: readonly DeckValue[]): readonly string[] =>
  pipe(
    decks,
    Arr.flatMap((deck) => deck.tags),
    Arr.dedupe,
  );

const withTag =
  (tag: Option.Option<string>) =>
  (decks: readonly DeckValue[]): readonly DeckValue[] =>
    Option.match(tag, {
      onNone: () => decks,
      onSome: (wanted) =>
        pipe(
          decks,
          Arr.filter((deck) => Arr.contains(deck.tags, wanted)),
        ),
    });

const excerpt = (text: string): string => {
  const flat = Str.replaceAll("\n", " ")(text);
  return pipe(
    Option.liftPredicate(flat, (line) => line.length > EXCERPT),
    Option.match({ onNone: () => flat, onSome: (line) => `${Str.slice(START, EXCERPT)(line)}…` }),
  );
};

export {
  Decks,
  Hits,
  SearchQuery,
  SlidesSearch,
  dayOf,
  deckUrl,
  excerpt,
  pageUrl,
  pdfUrl,
  tagsOf,
  withTag,
};
export type { DeckValue, HitValue, SlidesSearchValue };
