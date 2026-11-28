import { Query } from "@effect/ui";
import { SummarySchema } from "@ocr-decide/measurements/schema";
import summaryJson from "@ocr-decide/measurements/summary";
import { Effect, Schema } from "effect";

/** @stability experimental */
export class GetSummary extends Query.Service<GetSummary>()("measurements/GetSummary", {
  success: SummarySchema,
  staleTime: "Infinity",
}) {
  public static readonly layer = this.toLayer(
    Effect.succeed(() => Schema.decodeUnknownEffect(SummarySchema)(summaryJson).pipe(Effect.orDie)),
  );
}
