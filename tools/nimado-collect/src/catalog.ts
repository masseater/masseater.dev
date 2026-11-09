import { Array as Arr, Order, Record, Schema, pipe } from "effect";

const CatalogSong = Schema.Struct({
  id: Schema.Int,
  name: Schema.String,
  artist: Schema.String,
  type: Schema.String,
  published: Schema.String,
  nico: Schema.Array(Schema.String),
  youtube: Schema.Array(Schema.String),
});

const Crawl = Schema.Struct({
  next: Schema.OptionFromNullOr(Schema.Int),
  since: Schema.String,
});

const Catalog = Schema.Struct({
  crawl: Crawl,
  songs: Schema.Array(CatalogSong),
});

type CatalogSongValue = typeof CatalogSong.Type;
type CatalogValue = typeof Catalog.Type;

const hasVideo = ({ nico, youtube }: CatalogSongValue): boolean =>
  Arr.isReadonlyArrayNonEmpty(nico) || Arr.isReadonlyArrayNonEmpty(youtube);

const keyOf = (id: number): string => id.toString();

const mergeSongs = ({
  songs,
  updates,
  removed,
}: Readonly<{
  songs: readonly CatalogSongValue[];
  updates: readonly CatalogSongValue[];
  removed: readonly number[];
}>): readonly CatalogSongValue[] => {
  const gone = new Set(pipe(removed, Arr.map(keyOf)));
  return pipe(
    [...songs, ...updates],
    Arr.map((song) => [keyOf(song.id), song] as const),
    Record.fromEntries,
    Record.values,
    Arr.filter((song) => hasVideo(song) && !gone.has(keyOf(song.id))),
    Arr.sortWith(({ id }) => id, Order.Number),
  );
};

export type { CatalogSongValue, CatalogValue };
export { Catalog, mergeSongs };
