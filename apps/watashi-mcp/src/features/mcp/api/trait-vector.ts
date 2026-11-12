import { Array as Arr, HashSet, Number as Num, Option, Order, Record as Rec, pipe } from "effect";

import { isActive, keyText } from "./trait-state";
import type { Candidates, TraitState } from "./trait-state";

type Vector = readonly number[];

type Located = Readonly<{ ref: string; vector: Vector }>;

type Neighbourhood = Readonly<{
  traits: readonly TraitState[];
  vectors: Readonly<Record<string, Vector>>;
  sources: readonly Located[];
}>;

const NEAREST = 8;

const EMBED_CHARACTERS = 2000;

const SESSION = /^(?<group>conversation:[^/]+)\//u;

const NOTHING = 0;

const dot = (left: Vector, right: Vector): number =>
  Num.sumAll(Arr.zipWith(left, right, (one, other) => one * other));

const norm = (vector: Vector): number => Math.sqrt(dot(vector, vector));

const cosine = (left: Vector, right: Vector): number => {
  const size = norm(left) * norm(right);
  if (size === NOTHING) {
    return NOTHING;
  }
  return dot(left, right) / size;
};

const meanOf = (vectors: Arr.NonEmptyReadonlyArray<Vector>): Vector => {
  const [first] = vectors;
  return pipe(
    first,
    Arr.map(
      (_value, index) =>
        Num.sumAll(
          pipe(
            vectors,
            Arr.map((vector) =>
              pipe(
                Arr.get(vector, index),
                Option.getOrElse(() => NOTHING),
              ),
            ),
          ),
        ) / vectors.length,
    ),
  );
};

const piecesOf = (text: string): Arr.NonEmptyReadonlyArray<string> =>
  Arr.match(Arr.chunksOf(Arr.fromIterable(text), EMBED_CHARACTERS), {
    onEmpty: () => Arr.of(text),
    onNonEmpty: Arr.map((chunk: readonly string[]) => Arr.join(chunk, "")),
  });

const groupOf = (ref: string): string =>
  pipe(
    Option.fromNullishOr(SESSION.exec(ref)),
    Option.flatMap((match) => Option.fromNullishOr(match.groups)),
    Option.flatMap((groups) => Rec.get(groups, "group")),
    Option.getOrElse(() => ref),
  );

const nearestTo =
  (traits: readonly TraitState[], vectors: Readonly<Record<string, Vector>>, count: number) =>
  (vector: Vector): readonly string[] =>
    pipe(
      traits,
      Arr.map((trait) => keyText(trait.key)),
      Arr.flatMap((ref) =>
        pipe(
          Rec.get(vectors, ref),
          Option.map((stored) => [ref, cosine(vector, stored)] as const),
          Option.toArray,
        ),
      ),
      Arr.sortWith(([, score]) => score, Order.flip(Order.Number)),
      Arr.take(count),
      Arr.map(([ref]) => ref),
    );

const linkedTo =
  (traits: readonly TraitState[]) =>
  (ref: string): readonly string[] => {
    const group = groupOf(ref);
    return pipe(
      traits,
      Arr.filter((trait) =>
        pipe(
          trait.evidence,
          Arr.some((item) => groupOf(item.source) === group),
        ),
      ),
      Arr.map((trait) => keyText(trait.key)),
    );
  };

const candidatesOf = ({ traits, vectors, sources }: Neighbourhood): Candidates => {
  const active = pipe(traits, Arr.filter(isActive));
  const nearest = nearestTo(active, vectors, NEAREST);
  const linked = linkedTo(active);
  return Rec.fromEntries(
    pipe(
      sources,
      Arr.map(
        ({ ref, vector }) => [ref, pipe([...nearest(vector), ...linked(ref)], Arr.dedupe)] as const,
      ),
    ),
  );
};

const TOPIC_HITS = 15;

const relatedTo = ({
  traits,
  vectors,
  vector,
}: Readonly<{
  traits: readonly TraitState[];
  vectors: Readonly<Record<string, Vector>>;
  vector: Vector;
}>): HashSet.HashSet<string> => {
  const active = pipe(traits, Arr.filter(isActive));
  const hits = nearestTo(active, vectors, TOPIC_HITS)(vector);
  const groups = HashSet.fromIterable(
    pipe(
      active,
      Arr.filter((trait) => Arr.contains(hits, keyText(trait.key))),
      Arr.flatMap((trait) => trait.evidence),
      Arr.map((item) => groupOf(item.source)),
    ),
  );
  const neighbours = pipe(
    active,
    Arr.filter((trait) =>
      pipe(
        trait.evidence,
        Arr.some((item) => HashSet.has(groups, groupOf(item.source))),
      ),
    ),
    Arr.map((trait) => keyText(trait.key)),
  );
  return HashSet.fromIterable([...hits, ...neighbours]);
};

const unionOf = (candidates: Candidates): HashSet.HashSet<string> =>
  HashSet.fromIterable(pipe(Rec.values(candidates), Arr.flatten));

export { candidatesOf, groupOf, meanOf, piecesOf, relatedTo, unionOf };
export type { Located, Vector };
