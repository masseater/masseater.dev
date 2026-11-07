import { Array, Number, Option, pipe } from "effect";

const TOP_1 = 1;
const TOP_5 = 5;
const TOP_10 = 10;
const TOP_SHOWN = 3;
const NOT_FOUND = 0;
const FIRST_RANK = 1;

interface Ranked {
  readonly query: string;
  readonly expected: readonly string[];
  readonly results: readonly string[];
}

interface QueryScore {
  readonly query: string;
  readonly rank: number;
  readonly top: readonly string[];
}

interface Scores {
  readonly hitAt1: number;
  readonly hitAt5: number;
  readonly hitAt10: number;
  readonly mrr: number;
  readonly queries: readonly QueryScore[];
}

const rankOf = ({ expected, results }: Ranked): number =>
  pipe(
    results,
    Array.findFirstIndex((id) => Array.contains(expected, id)),
    Option.match({ onNone: () => NOT_FOUND, onSome: (index) => index + FIRST_RANK }),
  );

const isHit =
  (cutoff: number) =>
  (rank: number): boolean =>
    rank !== NOT_FOUND && rank <= cutoff;

const hitRate = (ranks: readonly number[], cutoff: number): number =>
  pipe(ranks, Array.filter(isHit(cutoff)), Array.length) / ranks.length;

const reciprocal = (rank: number): number => {
  if (rank === NOT_FOUND) {
    return NOT_FOUND;
  }
  return FIRST_RANK / rank;
};

const scoreOf = (entry: Ranked): QueryScore => ({
  query: entry.query,
  rank: rankOf(entry),
  top: Array.take(entry.results, TOP_SHOWN),
});

const score = (ranked: readonly Ranked[]): Scores => {
  const queries = pipe(ranked, Array.map(scoreOf));
  const ranks = pipe(
    queries,
    Array.map(({ rank }) => rank),
  );
  return {
    hitAt1: hitRate(ranks, TOP_1),
    hitAt5: hitRate(ranks, TOP_5),
    hitAt10: hitRate(ranks, TOP_10),
    mrr: pipe(ranks, Array.map(reciprocal), Number.sumAll) / ranks.length,
    queries,
  };
};

export { score };
export type { QueryScore, Ranked, Scores };
