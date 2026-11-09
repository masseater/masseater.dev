import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const LIFE_RECORDS = [
  "life_event",
  "media_item",
  "profile_fact",
  "metric_goal",
  "owner_reflection",
  "todo",
  "event_kind",
  "metric_definition",
] as const;

const SOURCES = ["said", "provided", "imported", "definition"] as const;

const NOT_RETRACTED = "";

const lifeRecord = sqliteTable(
  "life_record",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    record: text("record", { enum: LIFE_RECORDS }).notNull(),
    source: text("source", { enum: SOURCES }).notNull(),
    label: text("label").notNull().default(""),
    about: text("about").notNull().default(""),
    dayStart: text("day_start").notNull().default(""),
    dayEnd: text("day_end").notNull().default(""),
    body: text("body").notNull(),
    searchText: text("search_text").notNull().default(""),
    retractedAt: text("retracted_at").notNull().default(NOT_RETRACTED),
    retractReason: text("retract_reason").notNull().default(""),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("life_record_record_day_idx").on(table.record, table.dayEnd),
    index("life_record_record_label_idx").on(table.record, table.label),
  ],
);

type LifeRow = typeof lifeRecord.$inferSelect;

type LifeRecordName = LifeRow["record"];

type Source = LifeRow["source"];

export { LIFE_RECORDS, NOT_RETRACTED, SOURCES, lifeRecord };
export type { LifeRecordName, LifeRow, Source };
