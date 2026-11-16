import { settled, settledAs } from "@masseater.dev/media-notes-ui";
import type { ApiFailed } from "@masseater.dev/media-notes-ui";
import { ForecastSchema, PairSchema, StatementSchema } from "@masseater.dev/shirushi-protocol";
import type {
  Choice,
  Forecast,
  Judgement,
  Pair,
  Statement,
} from "@masseater.dev/shirushi-protocol";
import { Effect, Schema } from "effect";

import { commands } from "./generated/bindings.ts";

/** @internal */
export const fetchPairs: Effect.Effect<readonly Pair[], ApiFailed> = settledAs(
  Schema.decodeUnknownEffect(Schema.Array(PairSchema)),
)(() => commands.listPairs());

/** @internal */
export const answerPair =
  (choice: Choice) =>
  (id: string): Effect.Effect<void, ApiFailed> =>
    settled(() => commands.choosePair(id, choice)).pipe(Effect.asVoid);

/** @internal */
export const fetchStatements: Effect.Effect<readonly Statement[], ApiFailed> = settledAs(
  Schema.decodeUnknownEffect(Schema.Array(StatementSchema)),
)(() => commands.listStatements());

/** @internal */
export const judgeStatement =
  (judgement: Judgement) =>
  (id: string): Effect.Effect<void, ApiFailed> =>
    settled(() => commands.judgeStatement(id, judgement)).pipe(Effect.asVoid);

/** @internal */
export const fetchForecasts: Effect.Effect<readonly Forecast[], ApiFailed> = settledAs(
  Schema.decodeUnknownEffect(Schema.Array(ForecastSchema)),
)(() => commands.listForecasts());
