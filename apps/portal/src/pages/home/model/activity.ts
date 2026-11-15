import { Array as Arr, Option, Order, Record as Rec, String as Str, pipe } from "effect";

import type { SettingsValue, TransactionValue } from "#/entities/money";
import type { DeckValue } from "#/entities/slide";
import type { LifeItemValue, MemoValue, SessionValue } from "#/entities/watashi";
import { headline, placeOf } from "#/entities/watashi";
import { jstMinute, shownTime } from "#/shared/model";

export const ACTIVITY_KINDS = ["record", "memo", "conversation", "transaction", "slide"] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const KIND_LABELS: Readonly<Record<ActivityKind, string>> = {
  record: "記録",
  memo: "作業メモ",
  conversation: "会話",
  transaction: "取引",
  slide: "スライド",
};

export type ActivityLink =
  | Readonly<{ kind: "memo"; params: Readonly<{ project: string; name: string }> }>
  | Readonly<{ kind: "conversation"; params: Readonly<{ session: string }> }>
  | Readonly<{ kind: "page"; to: "/records" | "/money" | "/slides" }>;

export type Activity = Readonly<{
  key: string;
  kind: ActivityKind;
  stamp: string;
  title: string;
  context: string;
  link: ActivityLink;
}>;

const DAY_START = 0;

const DAY_END = 10;

const TIME_START = 11;

const TIME_END = 16;

const dayOf = (activity: Activity): string => Str.slice(DAY_START, DAY_END)(activity.stamp);

export const timeOf = (activity: Activity): string =>
  Str.slice(TIME_START, TIME_END)(activity.stamp);

const fromRecord = (item: LifeItemValue): Option.Option<Activity> =>
  pipe(
    Option.fromUndefinedOr(item.at),
    Option.map((at) => ({
      key: item.ref,
      kind: "record",
      stamp: shownTime(at),
      title: headline(item),
      context: item.place ?? item.kind ?? "",
      link: { kind: "page", to: "/records" },
    })),
  );

const fromMemo = (memo: MemoValue): Activity => ({
  key: memo.ref,
  kind: "memo",
  stamp: shownTime(memo.updatedAt),
  title: memo.name,
  context: memo.project,
  link: { kind: "memo", params: { project: memo.project, name: memo.name } },
});

const fromSession = (session: SessionValue): Activity => ({
  key: session.sessionId,
  kind: "conversation",
  stamp: jstMinute(session.lastAt),
  title: placeOf(session),
  context: session.source,
  link: { kind: "conversation", params: { session: session.sessionId } },
});

const fromTransaction =
  (categoryOf: (id: string) => string) =>
  (transaction: TransactionValue): Activity => ({
    key: `transaction:${String(transaction.id)}`,
    kind: "transaction",
    stamp: transaction.date,
    title: transaction.description,
    context: transaction.label ?? categoryOf(transaction.category),
    link: { kind: "page", to: "/money" },
  });

const fromDeck = (deck: DeckValue): Activity => ({
  key: deck.file,
  kind: "slide",
  stamp: Str.slice(DAY_START, DAY_END)(deck.updatedAt),
  title: deck.title,
  context: pipe(deck.tags, Arr.join("・")),
  link: { kind: "page", to: "/slides" },
});

const categoryIn =
  (categories: SettingsValue["categories"]) =>
  (id: string): string =>
    pipe(
      categories,
      Arr.findFirst((category) => category.id === id),
      Option.match({ onNone: () => id, onSome: (category) => category.label }),
    );

export type ActivitySources = Readonly<{
  records: readonly LifeItemValue[];
  memos: readonly MemoValue[];
  sessions: readonly SessionValue[];
  transactions: readonly TransactionValue[];
  categories: SettingsValue["categories"];
  decks: readonly DeckValue[];
}>;

export const activitiesOf = (sources: ActivitySources): readonly Activity[] => {
  const memos = pipe(sources.memos, Arr.map(fromMemo));
  const sessions = pipe(sources.sessions, Arr.map(fromSession));
  const toActivity = fromTransaction(categoryIn(sources.categories));
  const transactions = pipe(sources.transactions, Arr.map(toActivity));
  const decks = pipe(sources.decks, Arr.map(fromDeck));
  return pipe(
    sources.records,
    Arr.map(fromRecord),
    Arr.getSomes,
    Arr.appendAll(memos),
    Arr.appendAll(sessions),
    Arr.appendAll(transactions),
    Arr.appendAll(decks),
    Arr.sortWith((activity) => activity.stamp, Order.flip(Str.Order)),
  );
};

export type ActivityDay = Readonly<{ day: string; activities: readonly Activity[] }>;

export const byDay = (activities: readonly Activity[]): readonly ActivityDay[] =>
  pipe(
    activities,
    Arr.groupBy(dayOf),
    Rec.toEntries,
    Arr.map(([day, group]) => ({ day, activities: group })),
    Arr.sortWith((group) => group.day, Order.flip(Str.Order)),
  );

export const countSince = ({
  activities,
  kind,
  since,
}: Readonly<{ activities: readonly Activity[]; kind: ActivityKind; since: string }>): number =>
  pipe(
    activities,
    Arr.filter((activity) => activity.kind === kind && dayOf(activity) >= since),
    Arr.length,
  );
