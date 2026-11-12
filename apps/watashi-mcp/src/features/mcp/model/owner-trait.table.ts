import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const TRAIT_KINDS = [
  "rule",
  "preference",
  "stack",
  "workstyle",
  "communication",
  "value",
  "background",
] as const;

const TRAIT_STATUSES = ["active", "superseded", "retracted"] as const;

const STANCES = ["supports", "contradicts"] as const;

const TRAIT_ORIGINS = ["memory", "life", "conversation"] as const;

const ownerTrait = sqliteTable(
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

const ownerTraitEvidence = sqliteTable(
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

const ownerTraitVector = sqliteTable("owner_trait_vector", {
  traitId: integer("trait_id").primaryKey(),
  vector: text("vector").notNull(),
  updatedAt: text("updated_at").notNull(),
});

const traitCursor = sqliteTable("trait_cursor", {
  origin: text("origin", { enum: TRAIT_ORIGINS }).primaryKey(),
  position: text("position").notNull(),
  updatedAt: text("updated_at").notNull(),
});

type OwnerTrait = typeof ownerTrait.$inferSelect;

type OwnerTraitEvidence = typeof ownerTraitEvidence.$inferSelect;

type TraitKind = OwnerTrait["kind"];

type TraitStatus = OwnerTrait["status"];

type Stance = OwnerTraitEvidence["stance"];

type TraitOrigin = (typeof TRAIT_ORIGINS)[number];

export {
  STANCES,
  TRAIT_KINDS,
  TRAIT_ORIGINS,
  TRAIT_STATUSES,
  ownerTrait,
  ownerTraitEvidence,
  ownerTraitVector,
  traitCursor,
};
export type { OwnerTrait, OwnerTraitEvidence, Stance, TraitKind, TraitOrigin, TraitStatus };
