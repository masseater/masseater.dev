import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

const song = sqliteTable("song", {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  artist: text(),
  url: text(),
  genre: text(),
  note: text(),
});

const songAlias = sqliteTable(
  "song_alias",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    songId: integer("song_id")
      .notNull()
      .references(() => song.id, { onDelete: "cascade" }),
    alias: text().notNull(),
  },
  (table) => [
    unique().on(table.songId, table.alias),
    index("song_alias_alias_idx").on(table.alias),
  ],
);

export { song, songAlias };
