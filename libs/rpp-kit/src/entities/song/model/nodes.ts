import { Array as Arr, Number as Num, Option, pipe } from "effect";

import type { Chunk, Line, Node, Param } from "./parse.ts";

export type Query = Readonly<{ chunk: Chunk; token: string }>;

export type ParamQuery = Readonly<{ chunk: Chunk; token: string; index: number }>;

export const PARAM_INDEX = { first: 0, second: 1, third: 2, fourth: 3 } as const;

export const ZERO = 0;

export const linesOf = ({ chunk, token }: Query): readonly Line[] =>
  pipe(
    chunk.children,
    Arr.filter((node: Node): node is Line => node.kind === "line" && node.token === token),
  );

export const chunksOf = ({ chunk, token }: Query): readonly Chunk[] =>
  pipe(
    chunk.children,
    Arr.filter((node: Node): node is Chunk => node.kind === "chunk" && node.token === token),
  );

export const paramOf = ({ chunk, token, index }: ParamQuery): Option.Option<Param> =>
  pipe(
    Arr.head(linesOf({ chunk, token })),
    Option.flatMap((line) => Arr.get(line.params, index)),
  );

export const numberOr =
  (fallback: number) =>
  (param: Option.Option<Param>): number =>
    pipe(
      param,
      Option.flatMap((found) => Num.parse(found.text)),
      Option.getOrElse(() => fallback),
    );

export const textOf = (param: Option.Option<Param>): string =>
  Option.match(param, { onNone: () => "", onSome: (found) => found.text });
