import { Context } from "effect";
import type { Effect } from "effect";

import type { AnalystFailed } from "#/entities/trait/model/analyst-failed";
import type {
  AnalysisRequestValue,
  AnalysisResultValue,
} from "#/entities/trait/model/trait-analysis";

export class TraitAnalyst extends Context.Service<
  TraitAnalyst,
  {
    readonly analyze: (
      request: AnalysisRequestValue,
    ) => Effect.Effect<AnalysisResultValue, AnalystFailed>;
  }
>()("watashi-mcp/entities/trait/api/trait-analyst/TraitAnalyst") {}
