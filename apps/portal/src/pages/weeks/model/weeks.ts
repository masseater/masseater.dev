import { Array as Arr, DateTime, Option, Order, Record as Rec, String as Str, pipe } from "effect";

import type { MemoValue, WeeksSearchValue } from "#/entities/watashi/index.ts";

export type WeekValue = Readonly<{
  start: string;
  label: string;
  recent: boolean;
  memos: readonly MemoValue[];
}>;

export type MonthValue = Readonly<{ key: string; label: string; weeks: readonly WeekValue[] }>;

type Dated = Readonly<{ start: string; memo: MemoValue }>;

const WEEK_NAME = /^weekly-(?<start>\d{4}-\d{2}-\d{2})$/u;

const LAST_DAY = { days: 6 } as const;

const MONTH_KEY = { from: 0, to: 7 } as const;

const RECENT_WEEKS = 2;

const ANY = "";

const startOf = (memo: MemoValue): Option.Option<Dated> =>
  pipe(
    memo.name,
    Str.match(WEEK_NAME),
    Option.flatMap((found) => Option.fromNullishOr(found.groups)),
    Option.flatMap((groups) => Option.fromNullishOr(groups["start"])),
    Option.map((start) => ({ start, memo })),
  );

const monthKeyOf = (start: string): string => pipe(start, Str.slice(MONTH_KEY.from, MONTH_KEY.to));

const dayLabel = (start: string): string =>
  pipe(
    DateTime.make(start),
    Option.map((first) => {
      const from = DateTime.toPartsUtc(first);
      const to = DateTime.toPartsUtc(DateTime.add(first, LAST_DAY));
      const head = `${String(from.month)}/${String(from.day)}`;
      if (from.month === to.month) {
        return `${head}–${String(to.day)}`;
      }
      return `${head}–${String(to.month)}/${String(to.day)}`;
    }),
    Option.getOrElse(() => start),
  );

const monthLabel = (start: string): string =>
  pipe(
    DateTime.make(start),
    Option.map((first) => DateTime.toPartsUtc(first)),
    Option.map(({ year, month }) => `${String(year)}年${String(month)}月`),
    Option.getOrElse(() => monthKeyOf(start)),
  );

const includesWord =
  (keyword: string) =>
  (memo: MemoValue): boolean =>
    pipe(
      `${memo.description}\n${memo.content}`,
      Str.toLowerCase,
      Str.includes(Str.toLowerCase(keyword)),
    );

const matches =
  ({ project, keyword }: WeeksSearchValue) =>
  (memo: MemoValue): boolean =>
    pipe(
      Option.fromUndefinedOr(project),
      Option.filter((name) => name !== ANY),
      Option.match({ onNone: () => true, onSome: (name) => memo.project === name }),
    ) &&
    pipe(
      Option.fromUndefinedOr(keyword),
      Option.filter(Str.isNonEmpty),
      Option.match({ onNone: () => true, onSome: (word) => includesWord(word)(memo) }),
    );

const byProject = Order.mapInput(Str.Order, (memo: MemoValue) => memo.project);

type Grouped<Item> = readonly [string, Arr.NonEmptyReadonlyArray<Item>];

const newestKeyFirst = <Item>(
  groups: Readonly<Record<string, Arr.NonEmptyReadonlyArray<Item>>>,
): readonly Grouped<Item>[] =>
  pipe(
    Rec.toEntries(groups),
    Arr.sortWith(([key]) => key, Order.flip(Str.Order)),
  );

const weekOf = ([start, group]: Grouped<Dated>, index: number): WeekValue => ({
  start,
  label: dayLabel(start),
  recent: index < RECENT_WEEKS,
  memos: pipe(
    group,
    Arr.map(({ memo }) => memo),
    Arr.sortBy(byProject),
  ),
});

const monthOf = ([key, weeks]: Grouped<WeekValue>): MonthValue => ({
  key,
  label: monthLabel(Arr.headNonEmpty(weeks).start),
  weeks,
});

export const monthsOf =
  (search: WeeksSearchValue) =>
  (memos: readonly MemoValue[]): readonly MonthValue[] =>
    pipe(
      memos,
      Arr.filter(matches(search)),
      Arr.map(startOf),
      Arr.getSomes,
      Arr.groupBy((dated) => dated.start),
      newestKeyFirst,
      Arr.map(weekOf),
      Arr.groupBy((week) => monthKeyOf(week.start)),
      newestKeyFirst,
      Arr.map(monthOf),
    );

export const projectsOf = (memos: readonly MemoValue[]): readonly string[] =>
  pipe(
    memos,
    Arr.map((memo) => memo.project),
    Arr.dedupe,
    Arr.sortBy(Str.Order),
  );
