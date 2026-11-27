import { Array as Arr, HashSet, Number as Num, Option, Order, Record as Rec, pipe } from "effect";

import { isActive, keyText } from "./trait-state.ts";
import type { Candidates, TraitState } from "./trait-state.ts";

export type Vector = readonly number[];

export type Located = Readonly<{ ref: string; vector: Vector }>;

export type Neighbourhood = Readonly<{
  traits: readonly TraitState[];
  vectors: Readonly<Record<string, Vector>>;
  sources: readonly Located[];
}>;

const NEAREST = 8;

const EMBED_CHARACTERS = 2000;

const SESSION = /^(?<group>conversation:[^/]+)\//u;

const NOTHING = 0;

const STEP = 1;

const dot = (left: Vector, right: Vector): number => {
  let sum = NOTHING;
  for (let index = NOTHING; index < left.length; index += STEP) {
    sum += (left[index] ?? NOTHING) * (right[index] ?? NOTHING);
  }
  return sum;
};

const unitOf = (vector: Vector): Vector => {
  const size = Math.sqrt(dot(vector, vector));
  if (size === NOTHING) {
    return vector;
  }
  return pipe(
    vector,
    Arr.map((value) => value / size),
  );
};

export const meanOf = (vectors: Arr.NonEmptyReadonlyArray<Vector>): Vector => {
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

export const piecesOf = (text: string): Arr.NonEmptyReadonlyArray<string> =>
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

type Unit = readonly [ref: string, vector: Vector];

const unitsOf = (
  traits: readonly TraitState[],
  vectors: Readonly<Record<string, Vector>>,
): readonly Unit[] =>
  pipe(
    traits,
    Arr.map((trait) => keyText(trait.key)),
    Arr.flatMap((ref) =>
      pipe(
        Rec.get(vectors, ref),
        Option.map((stored): Unit => [ref, unitOf(stored)]),
        Option.toArray,
      ),
    ),
  );

const nearestTo =
  (units: readonly Unit[], count: number) =>
  (vector: Vector): readonly string[] =>
    pipe(
      units,
      Arr.map(([ref, unit]) => [ref, dot(vector, unit)] as const),
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

export const candidatesOf = ({ traits, vectors, sources }: Neighbourhood): Candidates => {
  const active = pipe(traits, Arr.filter(isActive));
  const nearest = nearestTo(unitsOf(active, vectors), NEAREST);
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

export const relatedTo = ({
  traits,
  vectors,
  vector,
}: Readonly<{
  traits: readonly TraitState[];
  vectors: Readonly<Record<string, Vector>>;
  vector: Vector;
}>): HashSet.HashSet<string> => {
  const active = pipe(traits, Arr.filter(isActive));
  const hits = nearestTo(unitsOf(active, vectors), TOPIC_HITS)(vector);
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

export const unionOf = (candidates: Candidates): HashSet.HashSet<string> =>
  HashSet.fromIterable(pipe(Rec.values(candidates), Arr.flatten));
