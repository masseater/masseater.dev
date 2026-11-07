import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const REVISION_ENTITIES = ["memory", "todo"] as const;

const REVISION_OPS = ["create", "update", "restore"] as const;

const revision = sqliteTable(
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

type Revision = typeof revision.$inferSelect;

type RevisionEntity = Revision["entity"];

type RevisionOp = Revision["op"];

export { REVISION_ENTITIES, REVISION_OPS, revision };
export type { Revision, RevisionEntity, RevisionOp };
