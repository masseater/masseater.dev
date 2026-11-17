import type { RuleName } from "#/shared/lib/problem.ts";

import { scalarKeyOffsets, workflowCheck } from "./workflow-yaml.ts";

const DEPTH_KEY = "fetch-depth";
const WHOLE_HISTORY = "0";
const RULE: RuleName = "full-history-checkout";
const MESSAGE =
  "fetches the whole history with `fetch-depth: 0`. Fetch only the commits the job reads.";

const fullHistoryOffsetsOf = scalarKeyOffsets({
  name: DEPTH_KEY,
  matches: (value) => value === WHOLE_HISTORY,
});

/** @internal */
export const checkFullHistoryCheckout = workflowCheck({
  rule: RULE,
  message: MESSAGE,
  offsetsOf: fullHistoryOffsetsOf,
});
