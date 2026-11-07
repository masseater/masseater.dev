import { SummarySchema } from "@ocr-decide/measurements/schema";
import type { Summary } from "@ocr-decide/measurements/schema";
import summaryJson from "@ocr-decide/measurements/summary";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Effect, Schema } from "effect";

const summaryQuery = queryOptions({
  queryKey: ["measurements", "summary"],
  queryFn: () => Effect.runPromise(Schema.decodeUnknownEffect(SummarySchema)(summaryJson)),
  staleTime: "static",
});

const useSummary = (): Summary => useSuspenseQuery(summaryQuery).data;

export { summaryQuery, useSummary };
