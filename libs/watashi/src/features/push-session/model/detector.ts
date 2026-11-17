import { makeDetector } from "@r_masseater/h56m";
import type { Finding as Found } from "@r_masseater/h56m";
import { Array as Arr, Effect, Order, pipe } from "effect";

import { SECRET_RULES } from "#/shared/config/index.ts";
import { WatashiFailed } from "#/shared/lib/errors.ts";

/** @internal */
export type Finding = Readonly<{
  ruleId: string;
  secret: string;
  encoded: boolean;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}>;

/** @internal */
export type Detector = (text: string) => Effect.Effect<readonly Finding[], WatashiFailed>;

const SCANNED_PATH = "conversation.jsonl";

const RANKS: Readonly<Record<Found["confidence"], number>> = { low: 0, medium: 1, high: 2 };

const mostSpecificFirst = Order.flip(
  Order.mapInput(Order.Number, (found: Found) => RANKS[found.confidence]),
);

const unavailable = (failure: { readonly message: string }): WatashiFailed =>
  WatashiFailed.make({ reason: "Secrets", message: failure.message });

/** @internal */
export const secretDetector: Effect.Effect<Detector, WatashiFailed> = makeDetector(
  SECRET_RULES,
).pipe(
  Effect.mapBoth({
    onFailure: unavailable,
    onSuccess:
      (detector): Detector =>
      (text) =>
        detector.scanText({ path: SCANNED_PATH, text }).pipe(
          Effect.mapBoth({
            onFailure: unavailable,
            onSuccess: (found) =>
              pipe(
                found,
                Arr.sortBy(mostSpecificFirst),
                Arr.map((item): Finding => ({
                  ruleId: item.rule,
                  secret: item.secret,
                  encoded: item.encoded,
                  startLine: item.line,
                  endLine: item.endLine,
                  startColumn: item.column,
                  endColumn: item.endColumn,
                })),
              ),
          }),
        ),
  }),
);
