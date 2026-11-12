import { Context } from "effect";
import type { Effect } from "effect";

import type { AnalystFailed } from "#/features/mcp/model/analyst-failed";
import type {
  AnalysisRequestValue,
  AnalysisResultValue,
} from "#/features/mcp/model/trait-analysis";

class TraitAnalyst extends Context.Service<
  TraitAnalyst,
  {
    readonly analyze: (
      request: AnalysisRequestValue,
    ) => Effect.Effect<AnalysisResultValue, AnalystFailed>;
  }
>()("watashi-mcp/features/mcp/api/trait-analyst/TraitAnalyst") {}

export { TraitAnalyst };
