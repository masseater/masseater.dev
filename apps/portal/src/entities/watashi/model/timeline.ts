import { Array as Arr, Option, Order, Schema, String as Str, pipe } from "effect";

import { shownTime, sortKey } from "#/shared/model/index.ts";

import { headline, labelsOf } from "./life-item";
import type { LifeItemValue } from "./life-item";

const PersonalEvent = Schema.Struct({
  occurredOn: Schema.String,
  title: Schema.String,
  note: Schema.String,
  topics: Schema.Array(Schema.String),
});

export const PersonalTimeline = Schema.Array(PersonalEvent);

type PersonalEventValue = typeof PersonalEvent.Type;

export type TimelineEntry = Readonly<{
  key: string;
  when: string;
  order: string;
  title: string;
  note: string;
  labels: readonly string[];
}>;

const DATED = /^\d{4}/u;

const START = "";

const fromPersonal = (events: readonly PersonalEventValue[]): readonly TimelineEntry[] =>
  pipe(
    events,
    Arr.mapAccum(START, (previous, event, index) => {
      const order = pipe(
        Option.liftPredicate(event.occurredOn, (day) => DATED.test(day)),
        Option.getOrElse(() => previous),
      );
      const entry: TimelineEntry = {
        key: `personal:${String(index)}`,
        when: event.occurredOn,
        order,
        title: event.title,
        note: event.note,
        labels: event.topics,
      };
      return [order, entry];
    }),
    ([, entries]) => entries,
  );

const fromLife = (item: LifeItemValue): readonly TimelineEntry[] =>
  pipe(
    Option.fromUndefinedOr(item.at),
    Option.map((at): TimelineEntry => ({
      key: item.ref,
      when: shownTime(at),
      order: sortKey(at),
      title: headline(item),
      note: "",
      labels: labelsOf(item),
    })),
    Option.toArray,
  );

const byOrder = Order.mapInput(Str.Order, (entry: TimelineEntry) => entry.order);

export const mergeTimeline = ({
  personal,
  life,
}: Readonly<{
  personal: typeof PersonalTimeline.Type;
  life: readonly LifeItemValue[];
}>): readonly TimelineEntry[] =>
  pipe([...fromPersonal(personal), ...pipe(life, Arr.flatMap(fromLife))], Arr.sortBy(byOrder));
