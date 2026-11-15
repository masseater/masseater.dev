import { Array as Arr, Option, Schema, String as Str, pipe } from "effect";

import { PERSONAL_ORIGIN } from "#/shared/config";

const Deck = Schema.Struct({
  file: Schema.String,
  title: Schema.String,
  tags: Schema.Array(Schema.String),
  createdAt: Schema.String,
  updatedAt: Schema.String,
});

export const Decks = Schema.Array(Deck);

const Hit = Schema.Struct({
  deck: Schema.String,
  title: Schema.String,
  page: Schema.Int,
  pages: Schema.Int,
  text: Schema.String,
  url: Schema.String,
  score: Schema.Finite,
});

export const Hits = Schema.Array(Hit);

export const SlidesSearch = Schema.Struct({
  keyword: Schema.optionalKey(Schema.String),
  tag: Schema.optionalKey(Schema.String),
});

export const SearchQuery = Schema.Struct({ keyword: Schema.NonEmptyString });

export type DeckValue = typeof Deck.Type;

export type SlidesSearchValue = typeof SlidesSearch.Type;

export type HitValue = typeof Hit.Type;

const EXCERPT = 160;

const START = 0;

const DAY_LENGTH = 10;

export const deckUrl = (file: string): string => `${PERSONAL_ORIGIN}/decks/${file}.html`;

export const pdfUrl = (file: string): string => `${PERSONAL_ORIGIN}/decks/${file}.pdf`;

export const pageUrl = ({ deck, page }: Readonly<{ deck: string; page: number }>): string =>
  `${deckUrl(deck)}#${String(page)}`;

export const dayOf = Str.slice(START, DAY_LENGTH);

export const tagsOf = (decks: readonly DeckValue[]): readonly string[] =>
  pipe(
    decks,
    Arr.flatMap((deck) => deck.tags),
    Arr.dedupe,
  );

export const withTag =
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

export const excerpt = (text: string): string => {
  const flat = Str.replaceAll("\n", " ")(text);
  return pipe(
    Option.liftPredicate(flat, (line) => line.length > EXCERPT),
    Option.match({ onNone: () => flat, onSome: (line) => `${Str.slice(START, EXCERPT)(line)}…` }),
  );
};
