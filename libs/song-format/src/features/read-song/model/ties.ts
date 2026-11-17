import { Array as Arr, Option, Record as Rec, pipe } from "effect";
import type { AstNode } from "langium";

import { problemAt, problemsOf } from "./problem.ts";
import type { Compiled, From, Problem } from "./problem.ts";

export const joined = <Value extends Joinable>([head, tail]: readonly [Value, Value]): Value => ({
  ...head,
  length: head.length + tail.length,
  releaseVelocity: tail.releaseVelocity,
});

export interface Joinable {
  readonly length: number;
  readonly releaseVelocity: Option.Option<number>;
}

export interface Tieable {
  readonly track: string;
  readonly start: number;
  readonly item: { readonly length: number; readonly tie: Option.Option<AstNode> };
}

export interface Chaining<Placed extends Tieable, Value> {
  readonly identity: From<Placed, string>;
  readonly valueOf: From<Placed, Value>;
  readonly join: From<readonly [Value, Value], Value>;
}

export interface Tied<Value> {
  readonly values: readonly Value[];
  readonly problems: readonly Problem[];
}

const keyOf = (identity: string, start: number): string => `${identity}:${String(start)}`;

const startKeyOf =
  <Placed extends Tieable>(identity: From<Placed, string>): From<Placed, string> =>
  (item) =>
    keyOf(identity(item), item.start);

const endKeyOf =
  <Placed extends Tieable>(identity: From<Placed, string>): From<Placed, string> =>
  (item) =>
    keyOf(identity(item), item.start + item.item.length);

export const tieChains =
  <Placed extends Tieable, Value>(
    chaining: Chaining<Placed, Value>,
  ): From<readonly Placed[], Tied<Value>> =>
  (placed) => {
    const endOf = endKeyOf(chaining.identity);
    const byStart = pipe(placed, Arr.groupBy(startKeyOf(chaining.identity)));
    const tiedByEnd = pipe(
      placed,
      Arr.filter((item) => Option.isSome(item.item.tie)),
      Arr.groupBy(endOf),
    );
    const successorOf: From<Placed, Option.Option<Placed>> = (item) =>
      pipe(
        item.item.tie,
        Option.flatMap(() => Rec.get(tiedByEnd, endOf(item))),
        Option.flatMap((sources) =>
          pipe(
            Rec.get(byStart, endOf(item)),
            Option.flatMap((candidates) => Arr.get(candidates, sources.indexOf(item))),
          ),
        ),
      );
    const consumed: ReadonlySet<Placed> = new Set(pipe(placed, Arr.map(successorOf), Arr.getSomes));
    const follow: From<Value, From<Placed, Compiled<Value>>> = (value) => (current) =>
      Option.match(current.item.tie, {
        onNone: () => ({ value, problems: [] }),
        onSome: (tie) =>
          Option.match(successorOf(current), {
            onNone: () => ({
              value,
              problems: [problemAt(tie)("tie")("tie の続きの音が次の小節の頭にありません")],
            }),
            onSome: (next) => follow(chaining.join([value, chaining.valueOf(next)]))(next),
          }),
      });
    const chains = pipe(
      placed,
      Arr.filter((item) => !consumed.has(item)),
      Arr.map((head) => follow(chaining.valueOf(head))(head)),
    );
    return {
      values: pipe(
        chains,
        Arr.map((chain) => chain.value),
      ),
      problems: problemsOf(chains),
    };
  };
