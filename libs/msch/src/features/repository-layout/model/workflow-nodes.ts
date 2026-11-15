import { Array as Arr, Option, pipe } from "effect";
import { isMap, isPair, isScalar, isSeq, parseDocument, visit } from "yaml";
import type { Pair, Scalar, YAMLMap, YAMLSeq } from "yaml";

const MISSING_OFFSET = 0;

/** @internal */
export interface Located {
  readonly text: string;
  readonly offset: number;
}

/** @internal */
export type Entry = readonly [string, unknown];

type Ranged = Scalar | YAMLMap | YAMLSeq;

const isRanged = (node: unknown): node is Ranged => isScalar(node) || isMap(node) || isSeq(node);

/** @internal */
export const isText = (node: unknown): node is Scalar<string> =>
  isScalar(node) && typeof node.value === "string";

const isTextPair = (pair: unknown): pair is Pair<Scalar<string>> =>
  isPair(pair) && isText(pair.key);

const offsetOf = (node: unknown): number =>
  pipe(
    Option.liftPredicate(node, isRanged),
    Option.flatMap((ranged) => Option.fromNullishOr(ranged.range)),
    Option.map(([start]) => start),
    Option.getOrElse(() => MISSING_OFFSET),
  );

/** @internal */
export const stringOf = (node: unknown): Option.Option<Located> =>
  pipe(
    Option.liftPredicate(node, isText),
    Option.map((scalar) => ({ text: scalar.value, offset: offsetOf(scalar) })),
  );

/** @internal */
export const childOf =
  (key: string) =>
  (node: unknown): unknown =>
    pipe(
      Option.liftPredicate(node, isMap),
      Option.map((map): unknown => map.get(key, true)),
      Option.getOrUndefined,
    );

/** @internal */
export const workingDirectoryOf = (owner: unknown): Option.Option<Located> => {
  const run = childOf("run")(childOf("defaults")(owner));
  return stringOf(childOf("working-directory")(run));
};

/** @internal */
export const itemsOf = (node: unknown): readonly unknown[] =>
  pipe(
    Option.liftPredicate(node, isSeq),
    Option.map((seq): readonly unknown[] => seq.items),
    Option.getOrElse((): readonly unknown[] => []),
  );

const pairsOf = (node: unknown): readonly unknown[] =>
  pipe(
    Option.liftPredicate(node, isMap),
    Option.map((map): readonly unknown[] => map.items),
    Option.getOrElse((): readonly unknown[] => []),
  );

/** @internal */
export const entriesOf = (node: unknown): readonly Entry[] =>
  pipe(
    pairsOf(node),
    Arr.filter(isTextPair),
    Arr.map((pair): Entry => [pair.key.value, pair.value]),
  );

/** @internal */
export const scalarsIn = (source: string): readonly Located[] => {
  const found: Located[] = [];
  visit(parseDocument(source), {
    Scalar: (_key, node) => {
      found.push(...Option.toArray(stringOf(node)));
    },
  });
  return found;
};
