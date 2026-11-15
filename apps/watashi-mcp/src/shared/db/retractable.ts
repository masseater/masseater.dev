import { text } from "drizzle-orm/sqlite-core";

const NOT_RETRACTED = "";

const retractableColumns = {
  retractedAt: text("retracted_at").notNull().default(NOT_RETRACTED),
  retractReason: text("retract_reason").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
};

export { NOT_RETRACTED, retractableColumns };
