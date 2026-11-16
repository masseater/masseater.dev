import { Array as Arr, Option, pipe } from "effect";
import { isScalar } from "yaml";

import type { RuleName } from "#/shared/lib/problem.ts";

import { pairsNamed, workflowCheck } from "./workflow-yaml.ts";

const DEPTH_KEY = "fetch-depth";
const WHOLE_HISTORY = "0";
const RULE: RuleName = "full-history-checkout";
const MESSAGE =
  "fetches the whole history with `fetch-depth: 0`. Fetch only the commits the job reads.";

const fullHistoryOffsetsOf = (source: string): readonly number[] =>
  pipe(
    pairsNamed(DEPTH_KEY)(source),
    Arr.filter(({ value }) => isScalar(value) && String(value.value) === WHOLE_HISTORY),
    Arr.flatMap(({ key }) =>
      pipe(
        Option.liftPredicate(key, isScalar),
        Option.flatMap((scalar) => Option.fromNullishOr(scalar.range)),
        Option.map(([start]) => start),
        Option.toArray,
      ),
    ),
  );

/** @internal */
export const checkFullHistoryCheckout = workflowCheck({
  rule: RULE,
  message: MESSAGE,
  offsetsOf: fullHistoryOffsetsOf,
});
