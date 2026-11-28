import { Query } from "@effect/ui";
import jaBenchJson from "@ocr-decide/measurements/ja-bench";
import { JaBenchSummarySchema } from "@ocr-decide/measurements/ja-bench-schema";
import { Effect, Schema } from "effect";

/** @stability experimental */
export class GetJaBench extends Query.Service<GetJaBench>()("measurements/GetJaBench", {
  success: JaBenchSummarySchema,
  staleTime: "Infinity",
}) {
  public static readonly layer = this.toLayer(
    Effect.succeed(() =>
      Schema.decodeUnknownEffect(JaBenchSummarySchema)(jaBenchJson).pipe(Effect.orDie),
    ),
  );
}
