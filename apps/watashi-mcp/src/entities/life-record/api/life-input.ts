import { Schema } from "effect";

import {
  EventKindBody,
  LifeEventBody,
  MEDIA_STATUSES,
  MEDIA_TYPES,
  MediaItemBody,
  MetricDefinitionBody,
  MetricGoalBody,
  OwnerReflectionBody,
  ProfileFactBody,
  Ref,
  TODO_STATUSES,
  Time,
  TodoBody,
} from "#/entities/life-record/model/life-body.ts";
import { LIFE_RECORDS, SOURCES } from "#/shared/db/index.ts";

import { BUCKETS } from "./life-groups.ts";

const MIN_ONE = 1;

export const DEFAULT_READ_LIMIT = 20;

const MAX_READ_LIMIT = 1000;

export const DEFAULT_PERIODS = 4;

const MAX_PERIODS = 24;

const READ_ORDERS = ["time", "recent", "relevance"] as const;

const Text = Schema.NonEmptyString;

const Names = Schema.Array(Text);

const Source = Schema.Literals(SOURCES).pick(["said", "provided", "imported"]);

const RevisionNumber = Schema.Int.check(Schema.isGreaterThanOrEqualTo(MIN_ONE));

const Retract = Schema.Literal(true).annotate({
  description: "Pass reason too",
});

const RestoreTo = RevisionNumber.annotate({
  description: "Revision from life_read with revisions: true",
});

const ChangeFields = Schema.Struct({
  ref: Ref,
  retract: Schema.optionalKey(Retract),
  reason: Schema.optionalKey(Text),
  restoreTo: Schema.optionalKey(RestoreTo),
});

const Change = Schema.StructWithRest(ChangeFields, [
  Schema.Record(Schema.String, Schema.Unknown),
]).annotate({
  description: "Change a record. Other keys replace its fields; null removes one",
});

const LifeEventCreate = Schema.Struct({
  record: Schema.Literal("life_event"),
  source: Source,
  ...LifeEventBody.fields,
});

const MediaItemCreate = Schema.Struct({
  record: Schema.Literal("media_item"),
  source: Source,
  ...MediaItemBody.fields,
});

const ProfileFactCreate = Schema.Struct({
  record: Schema.Literal("profile_fact"),
  source: Source,
  ...ProfileFactBody.fields,
});

const MetricGoalCreate = Schema.Struct({
  record: Schema.Literal("metric_goal"),
  source: Source,
  ...MetricGoalBody.fields,
});

const OwnerReflectionCreate = Schema.Struct({
  record: Schema.Literal("owner_reflection"),
  source: Source,
  ...OwnerReflectionBody.fields,
});

const TodoCreate = Schema.Struct({
  record: Schema.Literal("todo"),
  source: Source,
  ...TodoBody.fields,
});

const EventKindCreate = Schema.Struct({
  record: Schema.Literal("event_kind"),
  ...EventKindBody.fields,
});

const MetricDefinitionCreate = Schema.Struct({
  record: Schema.Literal("metric_definition"),
  ...MetricDefinitionBody.fields,
});

const WriteItem = Schema.Union([
  Change,
  LifeEventCreate,
  MediaItemCreate,
  ProfileFactCreate,
  MetricGoalCreate,
  OwnerReflectionCreate,
  TodoCreate,
  EventKindCreate,
  MetricDefinitionCreate,
]);

export const LifeWriteInput = Schema.Struct({
  records: Schema.Array(WriteItem).check(Schema.isMinLength(MIN_ONE)).annotate({
    description:
      "One record per event. source: said in this conversation, provided as a file or screen, or imported from a linked service; never AI memos or guesses. Times are ISO 8601; a time without a zone is Asia/Tokyo. On error nothing was written except the refs after Already written",
  }),
});

const ReadLimit = Schema.Int.check(
  Schema.isBetween({ minimum: MIN_ONE, maximum: MAX_READ_LIMIT }),
).annotate({ description: `Default ${DEFAULT_READ_LIMIT}` });

const Periods = Schema.Int.check(Schema.isBetween({ minimum: MIN_ONE, maximum: MAX_PERIODS }));

export const LifeReadInput = Schema.Struct({
  ref: Schema.optionalKey(Ref),
  revisions: Schema.optionalKey(Schema.Boolean),
  record: Schema.optionalKey(
    Schema.Literals([...LIFE_RECORDS, "digest"]).annotate({
      description:
        "Omit to search life_event, profile_fact and owner_reflection. digest: material to review from–to. event_kind: lists kinds, metrics, people, places, tags and topics",
    }),
  ),
  query: Schema.optionalKey(Text),
  from: Schema.optionalKey(
    Time.annotate({ description: "ISO 8601. A time without a zone is Asia/Tokyo" }),
  ),
  to: Schema.optionalKey(Time),
  kinds: Schema.optionalKey(Names),
  people: Schema.optionalKey(Names),
  place: Schema.optionalKey(Text),
  tags: Schema.optionalKey(Names),
  about: Schema.optionalKey(Text),
  asOf: Schema.optionalKey(Time),
  topics: Schema.optionalKey(Names),
  withHistory: Schema.optionalKey(Schema.Boolean),
  mediaType: Schema.optionalKey(Schema.Literals(MEDIA_TYPES)),
  status: Schema.optionalKey(Schema.Literals([...MEDIA_STATUSES, ...TODO_STATUSES])),
  creator: Schema.optionalKey(Text),
  order: Schema.optionalKey(Schema.Literals(READ_ORDERS)),
  limit: Schema.optionalKey(ReadLimit),
  fields: Schema.optionalKey(
    Names.annotate({ description: 'Paths to return, such as ["at.jst", "values.drinks"]' }),
  ),
  periods: Schema.optionalKey(
    Periods.annotate({
      description: `metric_goal periods to look back. Default ${DEFAULT_PERIODS}`,
    }),
  ),
});

const Bound = Schema.optionalKey(Schema.Finite);

const Condition = Schema.Struct({
  metric: Text,
  gt: Bound,
  gte: Bound,
  lt: Bound,
  lte: Bound,
});

const Period = Schema.Struct({ from: Time, to: Time });

const MIN_BINS = 2;

const BinEdges = Schema.Array(Schema.Finite).check(Schema.isMinLength(MIN_BINS));

const GroupBy = Schema.Union([
  Schema.Struct({ metric: Text, bins: BinEdges }),
  Schema.Struct({ by: Schema.Literals(["weekday", "kind"]) }),
  Schema.Struct({ has: Text }),
]);

const Metrics = Names.check(Schema.isMinLength(MIN_ONE)).annotate({
  description:
    "<metric>, count:<kind> or days:<kind or metric>. Names from life_read record: event_kind",
});

const CompareTo = Schema.Union([Period, Schema.Literal("previousYear"), Schema.Null]).annotate({
  description: "Default: the previous period of the same length. null: none",
});

export const LifeStatsInput = Schema.Struct({
  metrics: Metrics,
  from: Time.annotate({ description: "ISO 8601, inclusive like to" }),
  to: Time,
  bucket: Schema.optionalKey(Schema.Literals(BUCKETS)),
  compareTo: Schema.optionalKey(CompareTo),
  where: Condition.pipe(Schema.Array, Schema.optionalKey),
  groupBy: Schema.optionalKey(GroupBy),
});

export type WriteItemValue = typeof WriteItem.Type;

export type ChangeValue = typeof Change.Type;

export type LifeReadValue = typeof LifeReadInput.Type;

export type LifeStatsValue = typeof LifeStatsInput.Type;
