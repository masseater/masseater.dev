import { text } from "drizzle-orm/sqlite-core";

export const NOT_RETRACTED = "";

export const retractableColumns = {
  retractedAt: text("retracted_at").notNull().default(NOT_RETRACTED),
  retractReason: text("retract_reason").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
};
