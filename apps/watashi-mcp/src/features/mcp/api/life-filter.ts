import { Array as Arr, Option, Order, Predicate, Record as Rec, String as Str, pipe } from "effect";

import type { LifeRow } from "#/features/mcp/model/life-record.table";

import { NONE, lower, stringAt, textAt } from "./life-record";
import type { Body } from "./life-record";

type Entry = Readonly<{ row: LifeRow; body: Body }>;

type Filter = (entry: Entry) => boolean;

type FilterInput = Readonly<{
  kinds?: readonly string[];
  people?: readonly string[];
  place?: string;
  tags?: readonly string[];
  about?: string;
  topics?: readonly string[];
  mediaType?: string;
  status?: string;
  creator?: string;
}>;

type FactView = Readonly<{ asOf: Option.Option<string>; withHistory: boolean; today: string }>;

type FactState = "current" | "upcoming" | "ended";

const NO_SCORE = 0;

const ONE = 1;

const pass: Filter = () => true;

const isList = (value: unknown): value is readonly unknown[] => Arr.isArray(value);

const stringsAt =
  (key: string) =>
  (body: Body): readonly string[] =>
    pipe(
      Rec.get(body, key),
      Option.filter(isList),
      Option.map(Arr.filter(Predicate.isString)),
      Option.getOrElse((): readonly string[] => []),
    );

const contains =
  (needle: string) =>
  (hay: string): boolean =>
    Str.includes(lower(needle))(lower(hay));

const onRecord =
  (record: string, test: Filter): Filter =>
  (entry) =>
    entry.row.record !== record || test(entry);

const optionalFilter = <Value>(
  value: Value | undefined,
  build: (present: Value) => Filter,
): Filter =>
  pipe(Option.fromUndefinedOr(value), Option.match({ onNone: () => pass, onSome: build }));

const kindFilter = (kinds: readonly string[]): Filter =>
  onRecord("life_event", (entry) => pipe(kinds, Arr.contains(entry.row.label)));

const peopleFilter =
  (people: readonly string[]): Filter =>
  (entry) => {
    const names = [...stringsAt("people")(entry.body), entry.row.about];
    return pipe(
      people,
      Arr.some((wanted) => pipe(names, Arr.some(contains(wanted)))),
    );
  };

const textFilter =
  (key: string) =>
  (wanted: string): Filter =>
  (entry) =>
    contains(wanted)(textAt(key)(entry.body));

const tagFilter =
  (tags: readonly string[]): Filter =>
  (entry) =>
    pipe(
      stringsAt("tags")(entry.body),
      Arr.some((tag) => pipe(tags, Arr.contains(tag))),
    );

const aboutFilter =
  (about: string): Filter =>
  (entry) =>
    contains(about)(entry.row.about);

const topicFilter = (topics: readonly string[]): Filter =>
  onRecord("profile_fact", (entry) => pipe(topics, Arr.contains(entry.row.label)));

const equalFilter =
  (key: string) =>
  (wanted: string): Filter =>
  (entry) =>
    stringAt(key)(entry.body).pipe(Option.contains(wanted));

const filtersOf = (input: FilterInput): readonly Filter[] => [
  optionalFilter(input.kinds, kindFilter),
  optionalFilter(input.people, peopleFilter),
  optionalFilter(input.place, textFilter("place")),
  optionalFilter(input.tags, tagFilter),
  optionalFilter(input.about, aboutFilter),
  optionalFilter(input.topics, topicFilter),
  optionalFilter(input.mediaType, equalFilter("mediaType")),
  optionalFilter(input.status, equalFilter("status")),
  optionalFilter(input.creator, textFilter("creator")),
];

const factStateOf =
  (today: string) =>
  ({ row }: Entry): FactState => {
    if (row.dayStart > today) {
      return "upcoming";
    }
    if (row.dayEnd !== NONE && row.dayEnd <= today) {
      return "ended";
    }
    return "current";
  };

const holdsOn =
  (day: string) =>
  ({ row }: Entry): boolean =>
    row.dayStart <= day && (row.dayEnd === NONE || day < row.dayEnd);

const factFilter = ({ asOf, withHistory, today }: FactView): Filter => {
  if (withHistory) {
    return pass;
  }
  return Option.match(asOf, {
    onNone: () => onRecord("profile_fact", (entry) => factStateOf(today)(entry) !== "ended"),
    onSome: (day) => onRecord("profile_fact", holdsOn(day)),
  });
};

const matchesAll =
  (filters: readonly Filter[]) =>
  (entry: Entry): boolean =>
    pipe(
      filters,
      Arr.every((filter) => filter(entry)),
    );

const scoreOf =
  (terms: readonly string[]) =>
  (entry: Entry): number =>
    pipe(
      terms,
      Arr.filter((term) => contains(term)(entry.row.searchText)),
      Arr.length,
    );

const ordered =
  ({ order, terms }: Readonly<{ order: string; terms: readonly string[] }>) =>
  (entries: readonly Entry[]): readonly Entry[] => {
    if (order === "time") {
      return pipe(
        entries,
        Arr.sortWith((entry: Entry) => entry.row.dayStart, Order.String),
      );
    }
    if (order === "relevance") {
      return pipe(entries, Arr.sortWith(scoreOf(terms), Order.flip(Order.Number)));
    }
    return entries;
  };

const defaultOrder = (terms: readonly string[]): string =>
  Arr.match(terms, { onEmpty: () => "recent", onNonEmpty: () => "relevance" });

const nestedValue = (value: unknown, rest: readonly string[]): Option.Option<unknown> =>
  Arr.match(rest, {
    onEmpty: () => Option.some(value),
    onNonEmpty: ([key, ...tail]) =>
      pipe(
        Option.liftPredicate(value, Predicate.isObject),
        Option.flatMap((object) => Rec.get(object, key)),
        Option.flatMap((inner) => nestedValue(inner, tail)),
      ),
  });

const nestOf = (rest: readonly string[], value: unknown): unknown =>
  Arr.matchRight(rest, {
    onEmpty: () => value,
    onNonEmpty: (init, last) => nestOf(init, Rec.singleton(last, value)),
  });

const pathValue =
  (body: Body) =>
  (path: string): Option.Option<readonly [string, unknown]> => {
    const [head, ...rest] = pipe(path, Str.split("."));
    return pipe(
      Rec.get(body, head),
      Option.flatMap((value) => nestedValue(value, rest)),
      Option.map((value): readonly [string, unknown] => [head, nestOf(rest, value)]),
    );
  };

const deepMerge = (left: unknown, right: unknown): unknown => {
  if (Predicate.isObject(left) && Predicate.isObject(right)) {
    return Rec.union(left, right, deepMerge);
  }
  return right;
};

const mergeInto = (out: Body, [key, value]: readonly [string, unknown]): Body => {
  const merged = pipe(
    Rec.get(out, key),
    Option.match({ onNone: () => value, onSome: (current) => deepMerge(current, value) }),
  );
  return { ...out, [key]: merged };
};

const projected =
  (fields: readonly string[]) =>
  (item: Body): Body => {
    const picked = pipe(fields, Arr.map(pathValue(item)), Arr.getSomes);
    const base = pipe(
      item,
      Rec.filter((_value, key) => key === "ref"),
    );
    return Arr.reduce(picked, base, mergeInto);
  };

export {
  peopleFilter,
  NO_SCORE,
  ONE,
  defaultOrder,
  factFilter,
  factStateOf,
  filtersOf,
  holdsOn,
  matchesAll,
  ordered,
  projected,
  stringsAt,
};
export type { Entry, FactState, FactView, Filter, FilterInput };
