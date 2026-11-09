import { Array as Arr, Effect, Option, Order, Record as Rec, pipe } from "effect";

import type { StorageFailed } from "#/features/mcp/model/storage-failed";

import { factStateOf, stringsAt } from "./life-filter";
import type { Entry } from "./life-filter";
import { goalPeriods } from "./life-goals";
import { itemOf } from "./life-item";
import { SELF, textAt } from "./life-record";
import { loadStatsData } from "./life-stats-data.server";
import { scanAll } from "./life-store.server";
import { todayJst } from "./life-time";
import { findMemory, memoryItem } from "./memory-store.server";

type Body = Readonly<Record<string, unknown>>;

type ProfileContext = Readonly<{ entries: readonly Entry[]; today: string }>;

const TOP_PEOPLE = 10;

const CURRENT_PERIOD = 1;

const SUMMARY_KEY = { project: "assistant", name: "owner-summary" } as const;

const ofRecord =
  (record: string) =>
  (entry: Entry): boolean =>
    entry.row.record === record;

const isLive =
  (today: string) =>
  (entry: Entry): boolean =>
    factStateOf(today)(entry) !== "ended";

const facts = ({ entries, today }: ProfileContext): readonly Entry[] =>
  pipe(entries, Arr.filter(ofRecord("profile_fact")), Arr.filter(isLive(today)));

const ownerFacts = (context: ProfileContext): readonly Body[] =>
  pipe(
    facts(context),
    Arr.filter((entry) => entry.row.about === SELF),
    Arr.map(itemOf(context.today)),
  );

const isActiveGoal =
  (today: string) =>
  (entry: Entry): boolean =>
    Rec.get(entry.body, "active").pipe(Option.getOrElse(() => true)) !== false &&
    (entry.row.dayEnd === "" || entry.row.dayEnd >= today);

const activeGoals = (context: ProfileContext): Effect.Effect<readonly Body[], StorageFailed> =>
  loadStatsData.pipe(
    Effect.map((data) => {
      const periodsOf = goalPeriods({ data, today: context.today, count: CURRENT_PERIOD });
      return pipe(
        context.entries,
        Arr.filter(ofRecord("metric_goal")),
        Arr.filter(isActiveGoal(context.today)),
        Arr.map((entry) => ({
          ...itemOf(context.today)(entry),
          periods: periodsOf({
            body: entry.body,
            dayStart: entry.row.dayStart,
            dayEnd: entry.row.dayEnd,
          }),
        })),
      );
    }),
  );

const dueOf = (entry: Entry): string => entry.row.dayStart || "9999";

const openTodos = (context: ProfileContext): readonly Body[] =>
  pipe(
    context.entries,
    Arr.filter(ofRecord("todo")),
    Arr.filter((entry) => entry.row.label === "open"),
    Arr.sortWith(dueOf, Order.String),
    Arr.map(itemOf(context.today)),
  );

const personOf =
  (context: ProfileContext, events: readonly Entry[]) =>
  ([name, count]: readonly [string, number]): Body => ({
    name,
    count,
    ...pipe(
      events,
      Arr.findFirst((entry) => pipe(stringsAt("people")(entry.body), Arr.contains(name))),
      Option.match({ onNone: () => ({}), onSome: (entry) => ({ lastMet: entry.row.dayEnd }) }),
    ),
    facts: pipe(
      facts(context),
      Arr.filter((entry) => entry.row.about === name),
      Arr.map(itemOf(context.today)),
    ),
  });

const people = (context: ProfileContext): readonly Body[] => {
  const events = pipe(context.entries, Arr.filter(ofRecord("life_event")));
  const counts = pipe(
    events,
    Arr.flatMap(stringsAt("people")),
    Arr.groupBy((name) => name),
    Rec.map(Arr.length),
    Rec.toEntries,
    Arr.sortWith(([, count]) => count, Order.flip(Order.Number)),
    Arr.take(TOP_PEOPLE),
  );
  return pipe(counts, Arr.map(personOf(context, events)));
};

const recentMedia = (context: ProfileContext): readonly Body[] =>
  pipe(
    context.entries,
    Arr.filter(ofRecord("media_item")),
    Arr.filter((entry) => textAt("status")(entry.body) === "doing"),
    Arr.map(itemOf(context.today)),
  );

const aiSummary: Effect.Effect<Option.Option<Body>, StorageFailed> = findMemory(SUMMARY_KEY).pipe(
  Effect.map(Option.map(memoryItem)),
);

const watashiProfile: Effect.Effect<Body, StorageFailed> = Effect.gen(function* profileOfOwner() {
  const today = yield* todayJst;
  const entries = yield* scanAll([
    "profile_fact",
    "metric_goal",
    "todo",
    "media_item",
    "life_event",
  ]);
  const context = { entries, today };
  const goals = yield* activeGoals(context);
  const summary = yield* aiSummary;
  return {
    ownerFacts: ownerFacts(context),
    activeGoals: goals,
    openTodos: openTodos(context),
    people: people(context),
    recentMedia: recentMedia(context),
    aiSummary: Option.getOrNull(summary),
  };
});

export { watashiProfile };
