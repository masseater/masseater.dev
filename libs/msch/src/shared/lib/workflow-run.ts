import { Option, pipe } from "effect";
import type { Range } from "yaml";
import { isPair, isScalar, parseDocument, visit } from "yaml";

const RUN_KEY = "run";
const START = 0;

export interface RunScript {
  readonly text: string;
  readonly start: number;
}

const startOf = (range: Readonly<Range> | null | undefined): number =>
  pipe(
    Option.fromNullishOr(range),
    Option.map(([start]) => start),
    Option.getOrElse(() => START),
  );

export const runScriptsOf = (source: string): readonly RunScript[] => {
  const found: RunScript[] = [];
  visit(parseDocument(source), {
    Pair: (_key, pair) => {
      if (
        isPair(pair) &&
        isScalar(pair.key) &&
        pair.key.value === RUN_KEY &&
        isScalar(pair.value) &&
        typeof pair.value.value === "string"
      ) {
        found.push({ text: pair.value.value, start: startOf(pair.value.range) });
      }
    },
  });
  return found;
};
