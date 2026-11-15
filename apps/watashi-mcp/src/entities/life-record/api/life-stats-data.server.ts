import { Array as Arr, Effect, Option, Record as Rec, Schema, pipe } from "effect";

import { AGGREGATES } from "#/entities/life-record/model/life-body.ts";
import type { Aggregate } from "#/entities/life-record/model/life-body.ts";
import type { StorageFailed } from "#/shared/db/index.ts";

import type { StatEvent } from "./life-daily";
import { stringAt } from "./life-record";
import type { StatsData } from "./life-stats";
import { scanAll } from "./life-store.server.ts";
import type { LifeEntry } from "./life-store.server.ts";
import { isDayPrecise } from "./life-time";
import { valuesOf } from "./life-vocabulary.server.ts";

const isAggregate = Schema.is(Schema.Literals(AGGREGATES));

const statEventOf = ({ row, body }: LifeEntry): Option.Option<StatEvent> => {
  const at = stringAt("at")(body);
  const event = { kind: row.label, day: row.dayEnd, values: valuesOf(body) };
  return pipe(
    stringAt("until")(body),
    Option.orElse(() => at),
    Option.filter(isDayPrecise),
    Option.as(event),
  );
};

const statEventsOf = (entries: readonly LifeEntry[]): readonly StatEvent[] =>
  pipe(entries, Arr.map(statEventOf), Arr.getSomes);

const aggregateOf = (entry: LifeEntry): Aggregate =>
  pipe(
    Rec.get(entry.body, "aggregate"),
    Option.filter(isAggregate),
    Option.getOrElse((): Aggregate => "sum"),
  );

export const loadStatsData: Effect.Effect<StatsData, StorageFailed> = Effect.all({
  events: scanAll(["life_event"]).pipe(Effect.map(statEventsOf)),
  aggregates: scanAll(["metric_definition"]).pipe(
    Effect.map((entries) =>
      Rec.fromIterableWith(entries, (entry) => [entry.row.label, aggregateOf(entry)]),
    ),
  ),
});
