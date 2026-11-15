import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { LIFE_RECORDS } from "./life-record.table.ts";

export const REVISION_ENTITIES = [...LIFE_RECORDS, "memory", "owner_trait"] as const;

export const REVISION_OPS = ["create", "update", "restore", "retract"] as const;

export const revision = sqliteTable(
  "revision",
  {
    entity: text("entity", { enum: REVISION_ENTITIES }).notNull(),
    entityId: text("entity_id").notNull(),
    rev: integer("rev").notNull(),
    op: text("op", { enum: REVISION_OPS }).notNull(),
    body: text("body").notNull(),
    actor: text("actor").notNull(),
    at: text("at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.entity, table.entityId, table.rev] })],
);

export type Revision = typeof revision.$inferSelect;

export type RevisionEntity = Revision["entity"];

export type RevisionOp = Revision["op"];
