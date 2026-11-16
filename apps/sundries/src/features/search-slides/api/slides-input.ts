import { Schema } from "effect";

export const DEFAULT_SLIDE_LIMIT = 8;
const MAX_SLIDE_LIMIT = 20;
const MIN_SLIDE_LIMIT = 1;

const Deck = Schema.NonEmptyString.annotate({
  description: "Such as gisou-ukeoi, from search_slides",
});

const LimitRange = Schema.isBetween({ minimum: MIN_SLIDE_LIMIT, maximum: MAX_SLIDE_LIMIT });

const Limit = Schema.Int.check(LimitRange).annotate({
  description: `Default ${DEFAULT_SLIDE_LIMIT}`,
});

const DeckFilter = Deck.annotate({ description: "Search only this deck" });

export const SlideSearchInput = Schema.Struct({
  query: Schema.NonEmptyString,
  limit: Schema.optionalKey(Limit),
  deck: Schema.optionalKey(DeckFilter),
});

export const DeckInput = Schema.Struct({ deck: Deck });
