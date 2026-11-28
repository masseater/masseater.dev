import { searchKeyColumns } from "@masseater.dev/like-pattern/column";
import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const song = sqliteTable("song", {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  artist: text(),
  url: text(),
  genre: text(),
  note: text(),
  ...searchKeyColumns,
});

export const songAlias = sqliteTable(
  "song_alias",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    songId: integer("song_id")
      .notNull()
      .references(() => song.id, { onDelete: "cascade" }),
    alias: text().notNull(),
    ...searchKeyColumns,
  },
  (table) => [
    unique().on(table.songId, table.alias),
    index("song_alias_alias_idx").on(table.alias),
  ],
);
