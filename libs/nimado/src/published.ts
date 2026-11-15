import { Schema } from "effect";

export const Platform = Schema.Literals(["nico", "youtube"]);

export const Views = Schema.OptionFromNullOr(Schema.Int);

export const TableRow = Schema.Tuple([
  Schema.Int,
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.String,
  Views,
  Views,
]);

export const Table = Schema.Array(TableRow);

export const Video = Schema.Struct({ id: Schema.String, views: Views });

export const SongDetail = Schema.Struct({
  id: Schema.Int,
  name: Schema.String,
  artist: Schema.String,
  type: Schema.String,
  published: Schema.String,
  nico: Schema.Array(Video),
  youtube: Schema.Array(Video),
});

export const Shard = Schema.Array(SongDetail);

export const DayViews = Schema.Array(Schema.Tuple([Schema.Int, Schema.Int]));

const Days = Schema.Struct({
  nico: Schema.Array(Schema.String),
  youtube: Schema.Array(Schema.String),
});

export const Meta = Schema.Struct({
  generatedAt: Schema.String,
  songs: Schema.Int,
  catalogComplete: Schema.Boolean,
  days: Days,
});

export type PlatformName = typeof Platform.Type;
