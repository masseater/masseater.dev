import { asc, eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { Array as Arr, Effect, Match, Option, pipe } from "effect";

import { decide, normalized } from "#/entities/ledger/model/categories.ts";
import type { Category, Decision, Rule } from "#/entities/ledger/model/categories.ts";
import { rejected } from "#/shared/api/index.ts";
import type { Rejected } from "#/shared/api/index.ts";

import { db, query, runAll } from "./database";
import { categoryRules, transactions } from "./ledger.table.ts";

export type CategoryChoice = Readonly<{
  transactionId: number;
  category: Category | "auto";
  label: Option.Option<string>;
}>;

type Candidate = Readonly<{
  id: number;
  amount: number;
  normalized: string;
  category: Category;
  label: string | null;
}>;

type Choice = Partial<typeof transactions.$inferInsert>;

type Change = Readonly<{ id: number; decision: Decision }>;

const IDS_PER_UPDATE = 90;

const KEY_SEPARATOR = "\u0000";

export const userRules = query(() =>
  db
    .select({
      pattern: categoryRules.pattern,
      category: categoryRules.category,
      label: categoryRules.label,
    })
    .from(categoryRules)
    .orderBy(asc(categoryRules.id)),
).pipe(
  Effect.map(
    Arr.map(({ pattern, category, label }): Rule => ({
      pattern,
      category,
      label: Option.fromNullOr(label),
    })),
  ),
);

const changesOf = (rules: readonly Rule[], rows: readonly Candidate[]): readonly Change[] =>
  pipe(
    rows,
    Arr.map((row) => ({ id: row.id, decision: decide(rules)(row), row })),
    Arr.filter(
      ({ decision, row }) =>
        decision.category !== row.category || Option.getOrNull(decision.label) !== row.label,
    ),
    Arr.map(({ id, decision }) => ({ id, decision })),
  );

const updatesOf = (changes: readonly Change[]): readonly BatchItem<"sqlite">[] =>
  pipe(
    changes,
    Arr.groupBy(({ decision }) =>
      Arr.join([decision.category, Option.getOrElse(decision.label, () => "")], KEY_SEPARATOR),
    ),
    Arr.fromRecord,
    Arr.flatMap(([, group]) =>
      pipe(
        group,
        Arr.map(({ id }) => id),
        Arr.chunksOf(IDS_PER_UPDATE),
        Arr.map((ids) =>
          db
            .update(transactions)
            .set({
              category: Arr.headNonEmpty(group).decision.category,
              label: Option.getOrNull(Arr.headNonEmpty(group).decision.label),
            })
            .where(inArray(transactions.id, ids)),
        ),
      ),
    ),
  );

const choiceOf = (category: Category | "auto", label: Option.Option<string>): Choice =>
  Match.value(category).pipe(
    Match.when("auto", () => ({ manual: false })),
    Match.orElse((chosen) => ({ category: chosen, label: Option.getOrNull(label), manual: true })),
  );

const existing = (
  rows: readonly Readonly<{ id: number }>[],
  message: string,
): Effect.Effect<Readonly<{ id: number }>, Rejected> =>
  pipe(
    rows,
    Arr.head,
    Effect.fromOption,
    Effect.mapError(() => rejected(message)),
  );

const recategorize = Effect.fn("recategorize")(function* recategorize(rules: readonly Rule[]) {
  const rows = yield* query(() =>
    db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        normalized: transactions.normalized,
        category: transactions.category,
        label: transactions.label,
      })
      .from(transactions)
      .where(eq(transactions.manual, false)),
  );
  const changes = changesOf(rules, rows);
  yield* runAll(updatesOf(changes));
  return changes.length;
});

export const setCategory = Effect.fn("setCategory")(function* setCategory({
  transactionId,
  category,
  label,
}: CategoryChoice) {
  const where = eq(transactions.id, transactionId);
  const changed = yield* query(() =>
    db
      .update(transactions)
      .set(choiceOf(category, label))
      .where(where)
      .returning({ id: transactions.id }),
  );
  yield* existing(changed, `取引 ${transactionId} はありません`);
  const rules = yield* userRules;
  yield* recategorize(rules);
  return yield* query(() =>
    db
      .select({ id: transactions.id, category: transactions.category, label: transactions.label })
      .from(transactions)
      .where(where),
  );
});

export const setRule = Effect.fn("setRule")(function* setRule(rule: Rule) {
  const saved = { ...rule, pattern: normalized(rule.pattern) };
  const label = Option.getOrNull(saved.label);
  yield* query(() =>
    db
      .insert(categoryRules)
      .values({ pattern: saved.pattern, category: saved.category, label })
      .onConflictDoUpdate({
        target: categoryRules.pattern,
        set: { category: saved.category, label },
      }),
  );
  const rules = yield* userRules;
  const recategorized = yield* recategorize(rules);
  return { pattern: saved.pattern, category: saved.category, label, recategorized };
});

export const deleteRule = Effect.fn("deleteRule")(function* deleteRule(text: string) {
  const pattern = normalized(text);
  const deleted = yield* query(() =>
    db
      .delete(categoryRules)
      .where(eq(categoryRules.pattern, pattern))
      .returning({ id: categoryRules.id }),
  );
  yield* existing(deleted, `規則 ${pattern} はありません`);
  const rules = yield* userRules;
  const recategorized = yield* recategorize(rules);
  return { deleted: pattern, recategorized };
});
