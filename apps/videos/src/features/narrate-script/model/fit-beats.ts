import { Array as Arr, Number as Num, Option, Schema, pipe } from "effect";

const Rest = [Schema.Record(Schema.String, Schema.Unknown)] as const;

const Mora = Schema.StructWithRest(
  Schema.Struct({
    consonant_length: Schema.Finite.pipe(Schema.NullOr, Schema.optionalKey),
    vowel_length: Schema.Finite,
  }),
  Rest,
);

const Phrase = Schema.StructWithRest(
  Schema.Struct({
    moras: Schema.Array(Mora),
    pause_mora: Mora.pipe(Schema.NullOr, Schema.optionalKey),
  }),
  Rest,
);

/** @internal */
export const Query = Schema.StructWithRest(
  Schema.Struct({ accent_phrases: Schema.Array(Phrase) }),
  Rest,
);

type MoraType = typeof Mora.Type;
type PhraseType = typeof Phrase.Type;
/** @internal */
export type QueryType = typeof Query.Type;

const NONE = 0;
const ONE = 1;

const LEAD = -1;

/** @internal */
export const moraCount = (query: QueryType): number =>
  pipe(
    query.accent_phrases,
    Arr.map((phrase) => phrase.moras.length),
    Num.sumAll,
  );

interface Placed {
  readonly phrase: PhraseType;
  readonly start: number;
}

const placedOf = (query: QueryType): readonly Placed[] =>
  pipe(
    query.accent_phrases,
    Arr.mapAccum(NONE, (start, phrase) => [start + phrase.moras.length, { phrase, start }]),
    ([, placed]) => placed,
  );

interface Owners {
  readonly consonant: (mora: number) => number;
  readonly vowel: (mora: number) => number;
}

const ownersOf = (counts: readonly number[]): Owners => {
  const firsts = pipe(
    counts,
    Arr.mapAccum(NONE, (sum, count) => [sum + count, sum]),
    ([, starts]) => starts,
  );
  const vowel = (mora: number): number =>
    pipe(
      firsts,
      Arr.findLastIndex((first) => first <= mora),
      Option.getOrElse(() => NONE),
    );
  const consonant = (mora: number): number => {
    const part = vowel(mora);
    if (Arr.contains(firsts, mora)) {
      return part - ONE;
    }
    return part;
  };
  return { consonant, vowel };
};

interface Piece {
  readonly owner: number;
  readonly length: number;
}

const piecesOf = (placed: readonly Placed[], owners: Owners): readonly Piece[] =>
  pipe(
    placed,
    Arr.flatMap(({ phrase, start }) => [
      ...pipe(
        phrase.moras,
        Arr.flatMap((mora, offset) => [
          { owner: owners.consonant(start + offset), length: mora.consonant_length ?? NONE },
          { owner: owners.vowel(start + offset), length: mora.vowel_length },
        ]),
      ),
      ...Option.toArray(
        Option.map(Option.fromNullishOr(phrase.pause_mora), (pause) => ({
          owner: owners.vowel(start + phrase.moras.length - ONE),
          length: pause.vowel_length,
        })),
      ),
    ]),
  );

const lengthIn = (pieces: readonly Piece[], owner: number): number =>
  Num.sumAll(
    pipe(
      pieces,
      Arr.filter((piece) => piece.owner === owner),
      Arr.map((piece) => piece.length),
    ),
  );

/** @internal */
export interface FitRequest {
  readonly query: QueryType;

  readonly counts: readonly number[];

  readonly beats: readonly number[];
  readonly speed: number;

  readonly lead: number;
}

/** @internal */
export interface Fitted {
  readonly query: QueryType;

  readonly speeds: readonly number[];
  readonly onset: number;
}

const scaled = (mora: MoraType, consonant: number, vowel: number): MoraType => ({
  ...mora,
  consonant_length: Option.getOrNull(
    Option.map(Option.fromNullishOr(mora.consonant_length), (value) => value * consonant),
  ),
  vowel_length: mora.vowel_length * vowel,
});

interface Rescale {
  readonly placed: readonly Placed[];
  readonly owners: Owners;
  readonly factorOf: (owner: number) => number;
}

const rescaled = ({ placed, owners, factorOf }: Rescale): readonly PhraseType[] =>
  pipe(
    placed,
    Arr.map(({ phrase, start }) => ({
      ...phrase,
      moras: pipe(
        phrase.moras,
        Arr.map((mora, offset) =>
          scaled(
            mora,
            factorOf(owners.consonant(start + offset)),
            factorOf(owners.vowel(start + offset)),
          ),
        ),
      ),
      pause_mora: Option.getOrNull(
        Option.map(Option.fromNullishOr(phrase.pause_mora), (pause) => {
          const factor = factorOf(owners.vowel(start + phrase.moras.length - ONE));
          return scaled(pause, factor, factor);
        }),
      ),
    })),
  );

export const fitBeats = ({ query, counts, beats, speed, lead }: FitRequest): Fitted => {
  const owners = ownersOf(counts);
  const placed = placedOf(query);
  const pieces = piecesOf(placed, owners);
  const natural = ONE / speed;
  const onset = lead + lengthIn(pieces, LEAD) * natural;
  const targetOf = (segment: number): Option.Option<number> =>
    Option.map(
      Option.all([Arr.get(beats, segment), Arr.get(beats, segment + ONE)]),
      ([from, to]) => to - Math.max(from, onset),
    );
  const factors = pipe(
    counts,
    Arr.map((count, segment) =>
      pipe(
        targetOf(segment),
        Option.filter(() => count > NONE),
        Option.map((target) => target / lengthIn(pieces, segment)),
        Option.getOrElse(() => natural),
      ),
    ),
  );
  const factorOf = (owner: number): number =>
    Option.getOrElse(Arr.get(factors, owner), () => natural);
  return {
    query: { ...query, accent_phrases: rescaled({ placed, owners, factorOf }) },
    onset,
    speeds: pipe(
      factors,
      Arr.map((factor) => ONE / factor),
    ),
  };
};
