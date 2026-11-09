import {
  Array as Arr,
  Option,
  Predicate,
  Record as Rec,
  Result,
  String as Str,
  pipe,
} from "effect";

import { LIFE_RECORDS } from "#/features/mcp/model/life-record.table";
import type { LifeRecordName } from "#/features/mcp/model/life-record.table";

import { dayRangeOf, parseTime, storedOf, timeOut } from "./life-time";
import type { DayRange, TimeValue } from "./life-time";

type Body = Readonly<Record<string, unknown>>;

type Columns = Readonly<{
  label: string;
  about: string;
  dayStart: string;
  dayEnd: string;
  searchText: string;
}>;

type Normalized = Readonly<{ body: Body; assumed: readonly string[] }>;

type Span = Readonly<{ start: string; end: string; open: boolean; untilStart: boolean }>;

const REFERABLE = [...LIFE_RECORDS, "memory"] as const;

type Referable = (typeof REFERABLE)[number];

type Ref = Readonly<{ record: Referable; id: number }>;

const NONE = "";

const SELF = "self";

const REF_PATTERN = /^(?<record>[a-z_]+):(?<id>\d+)$/u;

const TIME_FIELDS: Readonly<Record<LifeRecordName, readonly string[]>> = {
  life_event: ["at", "until"],
  media_item: ["firstAt", "lastAt", "acquiredAt"],
  profile_fact: ["since", "until"],
  metric_goal: ["since", "until"],
  owner_reflection: ["from", "to"],
  todo: ["dueAt"],
  event_kind: [],
  metric_definition: [],
};

const SPANS: Readonly<Record<LifeRecordName, Span>> = {
  life_event: { start: "at", end: "until", open: false, untilStart: false },
  media_item: { start: "firstAt", end: "lastAt", open: false, untilStart: false },
  profile_fact: { start: "since", end: "until", open: true, untilStart: true },
  metric_goal: { start: "since", end: "until", open: true, untilStart: false },
  owner_reflection: { start: "from", end: "to", open: true, untilStart: false },
  todo: { start: "dueAt", end: "dueAt", open: false, untilStart: false },
  event_kind: { start: NONE, end: NONE, open: true, untilStart: false },
  metric_definition: { start: NONE, end: NONE, open: true, untilStart: false },
};

const LABEL_FIELDS: Readonly<Record<LifeRecordName, string>> = {
  life_event: "kind",
  media_item: "mediaType",
  profile_fact: "topic",
  metric_goal: "metric",
  owner_reflection: NONE,
  todo: "status",
  event_kind: "kind",
  metric_definition: "metric",
};

const ABOUT_FIELDS: Readonly<Record<LifeRecordName, string>> = {
  life_event: NONE,
  media_item: "title",
  profile_fact: "about",
  metric_goal: "name",
  owner_reflection: NONE,
  todo: "title",
  event_kind: NONE,
  metric_definition: NONE,
};

const DEFAULTS: Readonly<Record<LifeRecordName, Body>> = {
  life_event: {},
  media_item: {},
  profile_fact: { about: SELF },
  metric_goal: {},
  owner_reflection: {},
  todo: { status: "open", priority: "normal" },
  event_kind: {},
  metric_definition: {},
};

const stringAt =
  (key: string) =>
  (body: Body): Option.Option<string> =>
    pipe(Rec.get(body, key), Option.filter(Predicate.isString));

const textAt =
  (key: string) =>
  (body: Body): string =>
    pipe(
      stringAt(key)(body),
      Option.getOrElse(() => NONE),
    );

const assumedOf = (key: string, time: TimeValue): readonly string[] => {
  if (time.kind === "instant" && time.assumedZone) {
    return [key];
  }
  return [];
};

const withTime =
  ({ body, assumed }: Normalized, key: string) =>
  (time: TimeValue): Normalized => ({
    body: { ...body, [key]: storedOf(time) },
    assumed: [...assumed, ...assumedOf(key, time)],
  });

const parsedField =
  (normalized: Normalized, key: string) =>
  (input: string): Result.Result<Normalized, string> =>
    pipe(parseTime(input), Result.map(withTime(normalized, key)));

const normalizeField =
  (key: string) =>
  (normalized: Normalized): Result.Result<Normalized, string> =>
    Option.match(stringAt(key)(normalized.body), {
      onNone: () => Result.succeed(normalized),
      onSome: parsedField(normalized, key),
    });

const initialOf = (body: Body): Result.Result<Normalized, string> =>
  Result.succeed({ body, assumed: [] });

const normalizeTimes =
  (record: LifeRecordName) =>
  (body: Body): Result.Result<Normalized, string> =>
    Arr.reduce(TIME_FIELDS[record], initialOf(body), (state, key) =>
      pipe(state, Result.flatMap(normalizeField(key))),
    );

const fieldOut =
  (body: Body) =>
  (out: Body, key: string): Body =>
    Option.match(stringAt(key)(body), {
      onNone: () => out,
      onSome: (stored) => ({ ...out, [key]: timeOut(stored) }),
    });

const timesOut =
  (record: LifeRecordName) =>
  (body: Body): Body =>
    Arr.reduce(TIME_FIELDS[record], body, fieldOut(body));

const rangeAt =
  (key: string) =>
  (body: Body): Option.Option<DayRange> =>
    pipe(stringAt(key)(body), Option.map(dayRangeOf));

const edgeOf =
  (untilStart: boolean) =>
  (range: DayRange): string => {
    if (untilStart) {
      return range.start;
    }
    return range.end;
  };

const endOf = ({ start, end, open, untilStart }: Span, body: Body): string => {
  const own = pipe(rangeAt(end)(body), Option.map(edgeOf(untilStart)));
  const fallback = pipe(
    rangeAt(start)(body),
    Option.filter(() => !open),
    Option.map((range) => range.end),
  );
  return pipe(
    own,
    Option.orElse(() => fallback),
    Option.getOrElse(() => NONE),
  );
};

const startOf = ({ start }: Span, body: Body): string =>
  pipe(
    rangeAt(start)(body),
    Option.map((range) => range.start),
    Option.getOrElse(() => NONE),
  );

const stringsIn = (value: unknown): readonly string[] => {
  if (Predicate.isString(value)) {
    return [value];
  }
  if (Arr.isArray(value)) {
    return pipe(value, Arr.flatMap(stringsIn));
  }
  if (Predicate.isObject(value)) {
    return pipe(Rec.values(value), Arr.flatMap(stringsIn));
  }
  return [];
};

const columnsOf =
  (record: LifeRecordName) =>
  (body: Body): Columns => {
    const span = SPANS[record];
    return {
      label: textAt(LABEL_FIELDS[record])(body),
      about: textAt(ABOUT_FIELDS[record])(body),
      dayStart: startOf(span, body),
      dayEnd: endOf(span, body),
      searchText: pipe(stringsIn(body), Arr.join(" ")),
    };
  };

const withDefaults =
  (record: LifeRecordName) =>
  (body: Body): Body => ({ ...DEFAULTS[record], ...body });

const isReferable = (record: string): record is Referable =>
  pipe(REFERABLE, Arr.contains<string>(record));

const refOf = ({ record, id }: Readonly<{ record: string; id: number }>): string =>
  `${record}:${id}`;

const parseRef = (ref: string): Option.Option<Ref> =>
  pipe(
    Option.fromNullishOr(REF_PATTERN.exec(ref)),
    Option.flatMap((match) => Option.fromNullishOr(match.groups)),
    Option.flatMap(({ record = NONE, id = NONE }) =>
      pipe(
        Option.liftPredicate(record, isReferable),
        Option.map((name) => ({ record: name, id: Number(id) })),
      ),
    ),
  );

const isLifeRecord = (record: Referable): record is LifeRecordName => record !== "memory";

const lower = Str.toLowerCase;

export {
  NONE,
  SELF,
  TIME_FIELDS,
  columnsOf,
  isLifeRecord,
  lower,
  normalizeTimes,
  parseRef,
  refOf,
  stringAt,
  stringsIn,
  textAt,
  timesOut,
  withDefaults,
};
export type { Body, Columns, Normalized, Ref, Referable };
