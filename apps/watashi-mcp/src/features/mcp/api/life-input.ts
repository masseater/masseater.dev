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
} from "#/features/mcp/model/life-body";
import { LIFE_RECORDS } from "#/features/mcp/model/life-record.table";

import { BUCKETS } from "./life-groups";

const MIN_ONE = 1;

const DEFAULT_READ_LIMIT = 20;

const MAX_READ_LIMIT = 1000;

const DEFAULT_PERIODS = 4;

const MAX_PERIODS = 24;

const SAID_SOURCES = ["said", "provided", "imported"] as const;

const READ_ORDERS = ["time", "recent", "relevance"] as const;

const Text = Schema.NonEmptyString;

const Names = Schema.Array(Text);

const Source = Schema.Literals(SAID_SOURCES).annotate({
  description:
    "said: the owner said it in this conversation. provided: a file or screen the owner gave. imported: a linked service. Never write from AI memos, other notes or guesses.",
});

const RevisionNumber = Schema.Int.check(Schema.isGreaterThanOrEqualTo(MIN_ONE));

const Retract = Schema.Literal(true).annotate({
  description: "Retract the record. Pass reason too.",
});

const RestoreTo = RevisionNumber.annotate({
  description: "Restore the record to this revision (see life_read with revisions: true)",
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
  description:
    "Change an existing record. Other keys replace those fields of the record; null removes a field.",
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

const LifeWriteInput = Schema.Struct({
  records: Schema.Array(WriteItem).check(Schema.isMinLength(MIN_ONE)),
});

const ReadLimit = Schema.Int.check(
  Schema.isBetween({ minimum: MIN_ONE, maximum: MAX_READ_LIMIT }),
).annotate({ description: `Default ${DEFAULT_READ_LIMIT}` });

const Periods = Schema.Int.check(Schema.isBetween({ minimum: MIN_ONE, maximum: MAX_PERIODS }));

const LifeReadInput = Schema.Struct({
  ref: Schema.optionalKey(Ref),
  revisions: Schema.optionalKey(Schema.Boolean),
  record: Schema.optionalKey(Schema.Literals([...LIFE_RECORDS, "digest"])),
  query: Schema.optionalKey(Text),
  from: Schema.optionalKey(Time),
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
    Names.annotate({ description: 'Dotted paths to keep, such as ["at.jst", "values.drinks"]' }),
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
  description: "<metric>, count:<kind> or days:<kind or metric>",
});

const CompareTo = Schema.Union([Period, Schema.Literal("previousYear"), Schema.Null]).annotate({
  description: "Omit for the previous period of the same length. null for none.",
});

const LifeStatsInput = Schema.Struct({
  metrics: Metrics,
  from: Time,
  to: Time,
  bucket: Schema.optionalKey(Schema.Literals(BUCKETS)),
  compareTo: Schema.optionalKey(CompareTo),
  where: Schema.optionalKey(Schema.Array(Condition)),
  groupBy: Schema.optionalKey(GroupBy),
});

type WriteItemValue = typeof WriteItem.Type;

type ChangeValue = typeof Change.Type;

type LifeReadValue = typeof LifeReadInput.Type;

type LifeStatsValue = typeof LifeStatsInput.Type;

export {
  DEFAULT_PERIODS,
  DEFAULT_READ_LIMIT,
  LifeReadInput,
  LifeStatsInput,
  LifeWriteInput,
  READ_ORDERS,
};
export type { ChangeValue, LifeReadValue, LifeStatsValue, WriteItemValue };
