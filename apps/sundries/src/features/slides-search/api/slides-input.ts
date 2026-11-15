import { Schema } from "effect";

const DEFAULT_SLIDE_LIMIT = 8;
const MAX_SLIDE_LIMIT = 20;
const MIN_SLIDE_LIMIT = 1;

const Deck = Schema.NonEmptyString.annotate({
  description: "デッキ名(例: gisou-ukeoi)。search_slides の結果の deck を使う",
});

const LimitRange = Schema.isBetween({ minimum: MIN_SLIDE_LIMIT, maximum: MAX_SLIDE_LIMIT });

const Limit = Schema.Int.check(LimitRange).annotate({
  description: `返すスライドの枚数。既定は ${DEFAULT_SLIDE_LIMIT}`,
});

const DeckFilter = Deck.annotate({ description: "指定するとそのデッキだけを検索する" });

const SlideSearchInput = Schema.Struct({
  query: Schema.NonEmptyString.annotate({ description: "探したい内容。日本語の文でよい" }),
  limit: Schema.optionalKey(Limit),
  deck: Schema.optionalKey(DeckFilter),
});

const DeckInput = Schema.Struct({ deck: Deck });

export { DEFAULT_SLIDE_LIMIT, DeckInput, SlideSearchInput };
