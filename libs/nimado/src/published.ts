import { Schema } from "effect";

const Platform = Schema.Literals(["nico", "youtube"]);

const Views = Schema.OptionFromNullOr(Schema.Int);

const TableRow = Schema.Tuple([
  Schema.Int,
  Schema.String,
  Schema.String,
  Schema.String,
  Schema.String,
  Views,
  Views,
]);

const Table = Schema.Array(TableRow);

const Video = Schema.Struct({ id: Schema.String, views: Views });

const SongDetail = Schema.Struct({
  id: Schema.Int,
  name: Schema.String,
  artist: Schema.String,
  type: Schema.String,
  published: Schema.String,
  nico: Schema.Array(Video),
  youtube: Schema.Array(Video),
});

const Shard = Schema.Array(SongDetail);

const DayViews = Schema.Array(Schema.Tuple([Schema.Int, Schema.Int]));

const Days = Schema.Struct({
  nico: Schema.Array(Schema.String),
  youtube: Schema.Array(Schema.String),
});

const Meta = Schema.Struct({
  generatedAt: Schema.String,
  songs: Schema.Int,
  catalogComplete: Schema.Boolean,
  days: Days,
});

type PlatformName = typeof Platform.Type;

export type { PlatformName };
export { DayViews, Meta, Platform, Shard, SongDetail, Table, TableRow, Video, Views };
