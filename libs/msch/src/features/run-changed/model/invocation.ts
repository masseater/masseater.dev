import { Array as Arr, Option } from "effect";

const FLAG = "--batch-sources";
const NO_LIMIT = Number.POSITIVE_INFINITY;
const SMALLEST_LIMIT = 1;

export interface Invocation {
  readonly batchSources: number;
  readonly command: readonly [string, ...string[]];
}

/** @internal */
export const invocationOf = (args: readonly [string, ...string[]]): Option.Option<Invocation> => {
  const [first, limit, ...command] = args;
  if (first !== FLAG) {
    return Option.some({ batchSources: NO_LIMIT, command: args });
  }
  const batchSources = Number(limit);
  if (!Number.isInteger(batchSources) || batchSources < SMALLEST_LIMIT) {
    return Option.none();
  }
  return Option.liftPredicate(Arr.isReadonlyArrayNonEmpty)(command).pipe(
    Option.map((rest) => ({ batchSources, command: rest })),
  );
};
