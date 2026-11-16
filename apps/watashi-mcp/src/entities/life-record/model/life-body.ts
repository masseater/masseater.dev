import { Schema } from "effect";

const TIMES_OF_DAY = ["morning", "afternoon", "evening", "night"] as const;

export const MEDIA_TYPES = [
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

export const MEDIA_STATUSES = ["want", "doing", "done", "tried", "dropped", "owned"] as const;

const BOOK_ID_KEYS = ["isbn", "asin", "ndlBibId"] as const;

const SCREEN_ID_KEYS = ["tmdbId", "imdbId"] as const;

export const MEDIA_ID_KEYS = {
  book: BOOK_ID_KEYS,
  comic: BOOK_ID_KEYS,
  anime: ["annictWorkId", "malId"],
  movie: SCREEN_ID_KEYS,
  tv: SCREEN_ID_KEYS,
  game: ["steamAppId", "igdbId", "nintendoEshopId"],
  music: ["musicbrainzId", "spotifyId", "appleMusicId"],
  video: ["youtubeVideoId", "niconicoVideoId"],
  podcast: ["applePodcastsId", "spotifyId"],
} as const;

export const SHARED_MEDIA_ID_KEYS = ["konomiKey", "url"] as const;

const COMPARISONS = ["atLeast", "atMost"] as const;

export const GOAL_PERIODS = ["day", "week", "month"] as const;

export const TODO_STATUSES = ["open", "done", "canceled"] as const;

const TODO_PRIORITIES = ["high", "normal", "low"] as const;

export const AGGREGATES = ["sum", "avg", "last", "max", "min"] as const;

const MIN_RATING = 1;

const MAX_RATING = 5;

const MIN_TIMES = 0;

const Text = Schema.NonEmptyString;

export const Time = Schema.NonEmptyString;

export const Ref = Schema.String.check(Schema.isPattern(/^[a-z_]+:\d+$/u)).annotate({
  description: "Such as life_event:12",
});

const Names = Schema.Array(Text);

const Values = Schema.Record(Schema.String, Schema.Unknown).annotate({
  description:
    "Numbers to count, following the kind's valuesSchema, such as {drinks, yen} for kind met",
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
  description: "Only the ids of the mediaType's services, plus konomiKey and url",
});

export const LifeEventBody = Schema.Struct({
  text: Text.annotate({ description: "Close to the owner's own words" }),
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

export const MediaItemBody = Schema.Struct({
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

export const ProfileFactBody = Schema.Struct({
  about: Schema.optionalKey(Text.annotate({ description: "self (default) or a person's name" })),
  topic: Text,
  statement: Text,
  since: Schema.optionalKey(Time),
  until: Schema.optionalKey(Time),
});

export const MetricGoalBody = Schema.Struct({
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

export const OwnerReflectionBody = Schema.Struct({
  from: Time,
  to: Time,
  statements: Schema.Array(Statement),
});

export const TodoBody = Schema.Struct({
  title: Text,
  note: Schema.optionalKey(Schema.String),
  status: Schema.optionalKey(Schema.Literals(TODO_STATUSES)),
  priority: Schema.optionalKey(Schema.Literals(TODO_PRIORITIES)),
  dueAt: Schema.optionalKey(Time),
});

const ValuesSchema = Schema.Record(Schema.String, Schema.Unknown).annotate({
  description: "JSON Schema for values. Numeric properties are metric names",
});

export const EventKindBody = Schema.Struct({
  kind: Text,
  description: Schema.optionalKey(Text),
  valuesSchema: Schema.optionalKey(ValuesSchema),
});

export const MetricDefinitionBody = Schema.Struct({
  metric: Text,
  unit: Schema.optionalKey(Text),
  aggregate: Schema.optionalKey(Schema.Literals(AGGREGATES)),
  description: Schema.optionalKey(Text),
});

export type Aggregate = (typeof AGGREGATES)[number];

export type MediaType = (typeof MEDIA_TYPES)[number];
