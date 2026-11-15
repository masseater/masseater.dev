import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const TRAIT_KINDS = [
  "rule",
  "preference",
  "stack",
  "workstyle",
  "communication",
  "value",
  "background",
] as const;

export const TRAIT_STATUSES = ["active", "superseded", "retracted"] as const;

export const STANCES = ["supports", "contradicts"] as const;

export const TRAIT_ORIGINS = ["memory", "life", "conversation"] as const;

export const ownerTrait = sqliteTable(
  "owner_trait",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kind: text("kind", { enum: TRAIT_KINDS }).notNull(),
    scope: text("scope").notNull(),
    statement: text("statement").notNull(),
    why: text("why").notNull().default(""),
    status: text("status", { enum: TRAIT_STATUSES }).notNull(),
    supersededBy: integer("superseded_by"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("owner_trait_status_idx").on(table.status, table.kind)],
);

export const ownerTraitEvidence = sqliteTable(
  "owner_trait_evidence",
  {
    traitId: integer("trait_id").notNull(),
    source: text("source").notNull(),
    quote: text("quote").notNull(),
    stance: text("stance", { enum: STANCES }).notNull(),
    scope: text("scope").notNull(),
    observedAt: text("observed_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.traitId, table.source] }),
    index("owner_trait_evidence_source_idx").on(table.source),
  ],
);

export const ownerTraitVector = sqliteTable("owner_trait_vector", {
  traitId: integer("trait_id").primaryKey(),
  vector: text("vector").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const ownerTraitJa = sqliteTable("owner_trait_ja", {
  traitId: integer("trait_id").primaryKey(),
  sourceStatement: text("source_statement").notNull(),
  sourceWhy: text("source_why").notNull(),
  statement: text("statement").notNull(),
  why: text("why").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const traitCursor = sqliteTable("trait_cursor", {
  origin: text("origin", { enum: TRAIT_ORIGINS }).primaryKey(),
  position: text("position").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export type OwnerTrait = typeof ownerTrait.$inferSelect;

export type OwnerTraitEvidence = typeof ownerTraitEvidence.$inferSelect;

export type OwnerTraitJa = typeof ownerTraitJa.$inferSelect;

export type TraitKind = OwnerTrait["kind"];

export type TraitStatus = OwnerTrait["status"];

export type Stance = OwnerTraitEvidence["stance"];

export type TraitOrigin = (typeof TRAIT_ORIGINS)[number];
