import { index, integer, real, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

import { person } from "./person.table";
import { song } from "./song.table";
import { video } from "./video.table";

const part = sqliteTable(
  "part",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    videoId: integer("video_id")
      .notNull()
      .references(() => video.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    songId: integer("song_id").references(() => song.id, { onDelete: "set null" }),
    refVideoId: integer("ref_video_id").references(() => video.id, { onDelete: "set null" }),
    label: text(),
    bpm: text(),
    bars: text(),
    startSec: real("start_sec"),
    endSec: real("end_sec"),
    note: text(),
    comment: text(),
  },
  (table) => [
    index("part_video_position_idx").on(table.videoId, table.position),
    index("part_song_idx").on(table.songId),
    index("part_ref_video_idx").on(table.refVideoId),
  ],
);

const partStaff = sqliteTable(
  "part_staff",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    partId: integer("part_id")
      .notNull()
      .references(() => part.id, { onDelete: "cascade" }),
    personId: integer("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    role: text({ enum: ["audio", "video", "other"] }).notNull(),
  },
  (table) => [
    unique().on(table.partId, table.personId, table.role),
    index("part_staff_person_idx").on(table.personId),
  ],
);

export { part, partStaff };
