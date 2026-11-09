import { Array as Arr, Effect, Option, Record as Rec, pipe } from "effect";

import type { LifeRecordName } from "#/features/mcp/model/life-record.table";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";

import { peopleFilter } from "./life-filter";
import type { Entry } from "./life-filter";
import { goalPeriods } from "./life-goals";
import { itemOf } from "./life-item";
import { SELF, refOf, textAt } from "./life-record";
import type { Body } from "./life-record";
import { loadStatsData } from "./life-stats-data.server";
import { scanAll } from "./life-store.server";
import { readVocabulary } from "./life-vocabulary-read.server";

type ExtrasInput = Readonly<{
  record: Option.Option<LifeRecordName>;
  about: Option.Option<string>;
  periods: number;
  page: readonly Entry[];
  kept: readonly Entry[];
  today: string;
}>;

type Extras = Readonly<{ items: readonly Body[]; summary: Body }>;

type Extra = (input: ExtrasInput) => Effect.Effect<Extras, StorageFailed>;

const RECENT_EVENTS = 5;

const plainItems = ({ page, today }: ExtrasInput): readonly Body[] =>
  pipe(page, Arr.map(itemOf(today)));

const plain: Extra = (input) => Effect.succeed({ items: plainItems(input), summary: {} });

const lastByKind = (events: readonly Entry[], today: string): Body =>
  pipe(
    events,
    Arr.groupBy((entry: Entry) => entry.row.label),
    Rec.map((group) => itemOf(today)(Arr.headNonEmpty(group))),
  );

const personSummary =
  (input: ExtrasInput) =>
  (about: string): Effect.Effect<Body, StorageFailed> => {
    const mentions = peopleFilter([about]);
    return scanAll(["life_event"]).pipe(
      Effect.map(Arr.filter(mentions)),
      Effect.map((events) => ({
        recentEvents: pipe(events, Arr.take(RECENT_EVENTS), Arr.map(itemOf(input.today))),
        lastByKind: lastByKind(events, input.today),
      })),
    );
  };

const factExtras: Extra = (input) =>
  pipe(
    input.about,
    Option.filter((about) => about !== SELF),
    Option.match({ onNone: () => Effect.succeed({}), onSome: personSummary(input) }),
    Effect.map((summary) => ({ items: plainItems(input), summary })),
  );

const linkedEvents =
  (events: readonly Entry[]) =>
  (ref: string): Body => {
    const linked = pipe(
      events,
      Arr.filter((entry) => textAt("mediaItem")(entry.body) === ref),
    );
    return {
      count: Arr.length(linked),
      ...pipe(
        Arr.head(linked),
        Option.match({ onNone: () => ({}), onSome: (last) => ({ last: last.row.dayEnd }) }),
      ),
    };
  };

const mediaItem =
  (events: readonly Entry[], today: string) =>
  (entry: Entry): Body => ({
    ...itemOf(today)(entry),
    events: linkedEvents(events)(refOf(entry.row)),
  });

const mediaKey = (entry: Entry): string =>
  `${textAt("mediaType")(entry.body)}/${textAt("status")(entry.body)}`;

const mediaExtras: Extra = (input) =>
  scanAll(["life_event"]).pipe(
    Effect.map((events) => ({
      items: pipe(input.page, Arr.map(mediaItem(events, input.today))),
      summary: {
        counts: pipe(input.kept, Arr.groupBy(mediaKey), Rec.map(Arr.length)),
      },
    })),
  );

const goalItem =
  (input: ExtrasInput, goalsOf: (entry: Entry) => readonly Body[]) =>
  (entry: Entry): Body => ({ ...itemOf(input.today)(entry), periods: goalsOf(entry) });

const goalExtras: Extra = (input) =>
  loadStatsData.pipe(
    Effect.map((data) => {
      const periodsOf = goalPeriods({ data, today: input.today, count: input.periods });
      const goalsOf = (entry: Entry): readonly Body[] =>
        periodsOf({ body: entry.body, dayStart: entry.row.dayStart, dayEnd: entry.row.dayEnd });
      return { items: pipe(input.page, Arr.map(goalItem(input, goalsOf))), summary: {} };
    }),
  );

const vocabularyExtras: Extra = () =>
  readVocabulary.pipe(Effect.map((summary) => ({ items: [], summary })));

const EXTRAS: Readonly<Record<LifeRecordName, Extra>> = {
  life_event: plain,
  media_item: mediaExtras,
  profile_fact: factExtras,
  metric_goal: goalExtras,
  owner_reflection: plain,
  todo: plain,
  event_kind: vocabularyExtras,
  metric_definition: vocabularyExtras,
};

const extrasOf = (input: ExtrasInput): Effect.Effect<Extras, StorageFailed> =>
  Option.match(input.record, {
    onNone: () => plain(input),
    onSome: (record) => EXTRAS[record](input),
  });

export { extrasOf };
export type { Extras, ExtrasInput };
