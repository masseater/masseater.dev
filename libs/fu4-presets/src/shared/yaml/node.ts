import type { Position, YamlNode } from "@r_masseater/fu4";
import { Array as Arr, Option, pipe } from "effect";

const PAIR = 2;
const KEY = 0;
const VALUE = 1;

export interface Pair {
  readonly key: YamlNode;
  readonly value: YamlNode;
}

export interface Text extends Position {
  readonly value: string;
  readonly quoted: boolean;
}

export const isQuoted = (node: YamlNode): boolean =>
  node.style === "single-quoted" || node.style === "double-quoted";

export const isNull = (node: YamlNode): boolean => node.kind === "scalar" && node.tag === "!!null";

export const pairsOf = (node: YamlNode): readonly Pair[] =>
  pipe(
    Arr.chunksOf(node.children, PAIR),
    Arr.flatMap((chunk) =>
      pipe(
        Option.all([Arr.get(chunk, KEY), Arr.get(chunk, VALUE)]),
        Option.map(([key, value]): Pair => ({ key, value })),
        Option.toArray,
      ),
    ),
  );

export const valueAt =
  (key: string) =>
  (node: YamlNode): Option.Option<YamlNode> =>
    pipe(
      pairsOf(node),
      Arr.findFirst((pair) => pair.key.value === key),
      Option.map((pair) => pair.value),
    );

export const textOf = (node: YamlNode): Text => ({
  value: node.value,
  quoted: isQuoted(node),
  line: node.line,
  column: node.column,
});

export const describePosition = (position: Position): string =>
  `line:${String(position.line)},col:${String(position.column)}`;
