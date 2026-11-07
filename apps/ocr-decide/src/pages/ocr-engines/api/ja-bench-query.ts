import jaBenchJson from "@ocr-decide/measurements/ja-bench";
import { JaBenchSummarySchema } from "@ocr-decide/measurements/ja-bench-schema";
import type { JaBenchSummary } from "@ocr-decide/measurements/ja-bench-schema";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Effect, Schema } from "effect";

const jaBenchQuery = queryOptions({
  queryKey: ["measurements", "ja-bench"],
  queryFn: () => Effect.runPromise(Schema.decodeUnknownEffect(JaBenchSummarySchema)(jaBenchJson)),
  staleTime: "static",
});

const useJaBench = (): JaBenchSummary => useSuspenseQuery(jaBenchQuery).data;

export { jaBenchQuery, useJaBench };
