import { desc, eq } from "drizzle-orm";
import { Array as Arr, Effect, Option, Order, String as Str, pipe } from "effect";

import { SELF, factStateOf, itemOf, todayJst } from "#/entities/life-record";
import type { Body, Entry } from "#/entities/life-record";
import { scanAll } from "#/entities/life-record/index.server";
import { idOf, isActive, supportsOf } from "#/entities/trait";
import type { TraitState } from "#/entities/trait";
import { loadTraits } from "#/entities/trait/index.server";
import { memory, NOT_RETRACTED } from "#/shared/db";
import type { StorageFailed } from "#/shared/db";
import { db, query } from "#/shared/db/index.server";

const RECENT_MEMOS = 40;

const DAY_START = 0;

const DAY_END = 10;

const dayOf = Str.slice(DAY_START, DAY_END);

const NEVER_SEEN = "";

const lastSeenOf = (trait: TraitState): string =>
  pipe(
    trait.evidence,
    Arr.map((item) => dayOf(item.observedAt)),
    Arr.match({ onEmpty: () => NEVER_SEEN, onNonEmpty: Arr.max(Order.String) }),
  );

const traitInput = (trait: TraitState): Option.Option<Body> => {
  const supports = supportsOf(trait).length;
  return Option.map(idOf(trait), (ref) => ({
    ref,
    kind: trait.kind,
    scope: trait.scope,
    statement: trait.statement,
    supports,
    contradicts: trait.evidence.length - supports,
    lastSeen: lastSeenOf(trait),
  }));
};

const isOwnerFact =
  (today: string) =>
  (entry: Entry): boolean =>
    entry.row.about === SELF && factStateOf(today)(entry) !== "ended";

const ownerFacts = (today: string): Effect.Effect<readonly Body[], StorageFailed> =>
  scanAll(["profile_fact"]).pipe(
    Effect.map((entries) => pipe(entries, Arr.filter(isOwnerFact(today)), Arr.map(itemOf(today)))),
  );

const recentMemos: Effect.Effect<readonly Body[], StorageFailed> = query(() =>
  db
    .select({
      project: memory.project,
      name: memory.name,
      description: memory.description,
      updatedAt: memory.updatedAt,
    })
    .from(memory)
    .where(eq(memory.retractedAt, NOT_RETRACTED))
    .orderBy(desc(memory.updatedAt))
    .limit(RECENT_MEMOS),
).pipe(Effect.map(Arr.map((row) => ({ ...row, updatedAt: dayOf(row.updatedAt) }))));

export const profileSource: Effect.Effect<Body, StorageFailed> = Effect.gen(
  function* profileSourceOf() {
    const today = yield* todayJst;
    const traits = yield* loadTraits;
    return {
      ownerFacts: yield* ownerFacts(today),
      recentMemos: yield* recentMemos,
      traits: pipe(traits, Arr.filter(isActive), Arr.map(traitInput), Arr.getSomes),
    };
  },
);
