import { Schema } from "effect";

const TIMES_OF_DAY = ["morning", "afternoon", "evening", "night"] as const;

const MEDIA_TYPES = [
  "book",
  "comic",
  "anime",
  "movie",
  "tv",
  "game",
  "music",
  "video",
  "podcast",
] as const;

const MEDIA_STATUSES = ["want", "doing", "done", "tried", "dropped", "owned"] as const;

const MEDIA_ID_KEYS = {
  book: ["isbn", "asin", "ndlBibId"],
  comic: ["isbn", "asin", "ndlBibId"],
  anime: ["annictWorkId", "malId"],
  movie: ["tmdbId", "imdbId"],
  tv: ["tmdbId", "imdbId"],
  game: ["steamAppId", "igdbId", "nintendoEshopId"],
  music: ["musicbrainzId", "spotifyId", "appleMusicId"],
  video: ["youtubeVideoId", "niconicoVideoId"],
  podcast: ["applePodcastsId", "spotifyId"],
} as const;

const SHARED_MEDIA_ID_KEYS = ["konomiKey", "url"] as const;

const COMPARISONS = ["atLeast", "atMost"] as const;

const GOAL_PERIODS = ["day", "week", "month"] as const;

const TODO_STATUSES = ["open", "done", "canceled"] as const;

const TODO_PRIORITIES = ["high", "normal", "low"] as const;

const AGGREGATES = ["sum", "avg", "last", "max", "min"] as const;

const MIN_RATING = 1;

const MAX_RATING = 5;

const MIN_TIMES = 0;

const Text = Schema.NonEmptyString;

const Time = Schema.NonEmptyString.annotate({
  description:
    "ISO 8601 with a time zone (2026-11-08T19:00+09:00 or 2026-11-08T10:00Z), or a date (2026-11-08), month (2024-03) or year (2010). A time without a zone is read as Asia/Tokyo.",
});

const Ref = Schema.String.check(Schema.isPattern(/^[a-z_]+:\d+$/u)).annotate({
  description: "A record reference such as life_event:12 or memory:3",
});

const Names = Schema.Array(Text);

const Values = Schema.Record(Schema.String, Schema.Unknown).annotate({
  description:
    "Values that follow the kind's valuesSchema. Numeric keys are metric names. Omit when there are no numbers.",
});

const MediaIds = Schema.Struct({
  isbn: Schema.optionalKey(Text),
  asin: Schema.optionalKey(Text),
  ndlBibId: Schema.optionalKey(Text),
  annictWorkId: Schema.optionalKey(Text),
  malId: Schema.optionalKey(Text),
  tmdbId: Schema.optionalKey(Text),
  imdbId: Schema.optionalKey(Text),
  steamAppId: Schema.optionalKey(Text),
  igdbId: Schema.optionalKey(Text),
  nintendoEshopId: Schema.optionalKey(Text),
  musicbrainzId: Schema.optionalKey(Text),
  spotifyId: Schema.optionalKey(Text),
  appleMusicId: Schema.optionalKey(Text),
  youtubeVideoId: Schema.optionalKey(Text),
  niconicoVideoId: Schema.optionalKey(Text),
  applePodcastsId: Schema.optionalKey(Text),
  konomiKey: Schema.optionalKey(Text),
  url: Schema.optionalKey(Text),
}).annotate({
  description:
    "IDs allowed per mediaType. book/comic: isbn, asin, ndlBibId. anime: annictWorkId, malId. movie/tv: tmdbId, imdbId. game: steamAppId, igdbId, nintendoEshopId. music: musicbrainzId, spotifyId, appleMusicId. video: youtubeVideoId, niconicoVideoId. podcast: applePodcastsId, spotifyId. Any type: konomiKey, url.",
});

const LifeEventBody = Schema.Struct({
  text: Text.annotate({ description: "What happened, close to the owner's own words" }),
  at: Time,
  until: Schema.optionalKey(Time),
  kind: Schema.optionalKey(Text),
  values: Schema.optionalKey(Values),
  timeOfDay: Schema.optionalKey(Schema.Literals(TIMES_OF_DAY)),
  people: Schema.optionalKey(Names),
  place: Schema.optionalKey(Text),
  tags: Schema.optionalKey(Names),
  mediaItem: Schema.optionalKey(Ref),
});

const Rating = Schema.Int.check(Schema.isBetween({ minimum: MIN_RATING, maximum: MAX_RATING }));

const Times = Schema.Int.check(Schema.isGreaterThanOrEqualTo(MIN_TIMES));

const MediaItemBody = Schema.Struct({
  mediaType: Schema.Literals(MEDIA_TYPES),
  title: Text,
  creator: Schema.optionalKey(Text),
  status: Schema.optionalKey(Schema.Literals(MEDIA_STATUSES)),
  rating: Schema.optionalKey(Rating),
  review: Schema.optionalKey(Text),
  firstAt: Schema.optionalKey(Time),
  lastAt: Schema.optionalKey(Time),
  acquiredAt: Schema.optionalKey(Time),
  times: Schema.optionalKey(Times),
  progress: Schema.optionalKey(Text),
  ids: Schema.optionalKey(MediaIds),
  tags: Schema.optionalKey(Names),
});

const ProfileFactBody = Schema.Struct({
  about: Schema.optionalKey(Text.annotate({ description: "self (default) or a person's name" })),
  topic: Text,
  statement: Text,
  since: Schema.optionalKey(Time),
  until: Schema.optionalKey(Time),
});

const MetricGoalBody = Schema.Struct({
  name: Text,
  metric: Text,
  target: Schema.Finite,
  comparison: Schema.Literals(COMPARISONS),
  period: Schema.Literals(GOAL_PERIODS),
  since: Schema.optionalKey(Time),
  until: Schema.optionalKey(Time),
  active: Schema.optionalKey(Schema.Boolean),
});

const Statement = Schema.Struct({
  text: Text.annotate({ description: "The owner's own words" }),
  evidence: Schema.Array(Ref),
});

const OwnerReflectionBody = Schema.Struct({
  from: Time,
  to: Time,
  statements: Schema.Array(Statement),
});

const TodoBody = Schema.Struct({
  title: Text,
  note: Schema.optionalKey(Schema.String),
  status: Schema.optionalKey(Schema.Literals(TODO_STATUSES)),
  priority: Schema.optionalKey(Schema.Literals(TODO_PRIORITIES)),
  dueAt: Schema.optionalKey(Time),
});

const ValuesSchema = Schema.Record(Schema.String, Schema.Unknown).annotate({
  description: "JSON Schema for values. Numeric properties should be metric names.",
});

const EventKindBody = Schema.Struct({
  kind: Text,
  description: Schema.optionalKey(Text),
  valuesSchema: Schema.optionalKey(ValuesSchema),
});

const MetricDefinitionBody = Schema.Struct({
  metric: Text,
  unit: Schema.optionalKey(Text),
  aggregate: Schema.optionalKey(Schema.Literals(AGGREGATES)),
  description: Schema.optionalKey(Text),
});

const LIFE_BODIES = {
  life_event: LifeEventBody,
  media_item: MediaItemBody,
  profile_fact: ProfileFactBody,
  metric_goal: MetricGoalBody,
  owner_reflection: OwnerReflectionBody,
  todo: TodoBody,
  event_kind: EventKindBody,
  metric_definition: MetricDefinitionBody,
} as const;

type LifeEventValue = typeof LifeEventBody.Type;

type MediaItemValue = typeof MediaItemBody.Type;

type ProfileFactValue = typeof ProfileFactBody.Type;

type MetricGoalValue = typeof MetricGoalBody.Type;

type OwnerReflectionValue = typeof OwnerReflectionBody.Type;

type TodoValue = typeof TodoBody.Type;

type EventKindValue = typeof EventKindBody.Type;

type MetricDefinitionValue = typeof MetricDefinitionBody.Type;

type Aggregate = (typeof AGGREGATES)[number];

type MediaType = (typeof MEDIA_TYPES)[number];

export {
  AGGREGATES,
  COMPARISONS,
  EventKindBody,
  GOAL_PERIODS,
  LIFE_BODIES,
  LifeEventBody,
  MEDIA_ID_KEYS,
  MEDIA_STATUSES,
  MEDIA_TYPES,
  MediaItemBody,
  MetricDefinitionBody,
  MetricGoalBody,
  OwnerReflectionBody,
  ProfileFactBody,
  Ref,
  SHARED_MEDIA_ID_KEYS,
  TIMES_OF_DAY,
  TODO_PRIORITIES,
  TODO_STATUSES,
  Time,
  TodoBody,
};
export type {
  Aggregate,
  EventKindValue,
  LifeEventValue,
  MediaItemValue,
  MediaType,
  MetricDefinitionValue,
  MetricGoalValue,
  OwnerReflectionValue,
  ProfileFactValue,
  TodoValue,
};
