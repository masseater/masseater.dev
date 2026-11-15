import { failedAt } from "@masseater.dev/mcp-tool-call";
import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { env } from "cloudflare:workers";
import { and, asc, desc, eq, gte, lt, lte, or, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { drizzle } from "drizzle-orm/d1";
import { Array as Arr, Clock, Effect, Number as Num, Option, Order, pipe } from "effect";

import {
  BUILT_IN_RULES,
  CATEGORIES,
  CATEGORY_LABELS,
  fallbackCategory,
  flowOf,
  normalized,
} from "../model/categories";
import type { Category, Rule } from "../model/categories";
import { fingerprinted } from "../model/fingerprint";
import type { Entry } from "../model/fingerprint";
import type { AccountPosition, CategoryTotal, MonthTotal } from "../model/reports";
import { accounts, balances, categoryRules, imports, transactions } from "./ledger.table";
import { rejected } from "./rejected";
import type { Rejected } from "./rejected";

type Account = typeof accounts.$inferSelect;

type Transaction = Omit<typeof transactions.$inferSelect, "normalized" | "hash">;

type LedgerEntry = Entry & Readonly<{ memo: string | null }>;

type Imported = Readonly<{ importId: string | null; added: number; duplicates: number }>;

type Period = Readonly<{ from: string; to: string }>;

type TransactionFilter = Period &
  Readonly<{ account?: string; category?: Category; cursor?: string }>;

type TransactionPage = Readonly<{ transactions: readonly Transaction[]; next: string | null }>;

type Failure = UpstreamFailed | Rejected;

type Batch = readonly [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]];

const PAGE_SIZE = 100;

const CHUNK_BYTES = 1_000_000;

const LAST_DAY = "31";

const FIRST_DAY = "01";

const POSITIVE = 1;

const NEGATIVE = -1;

const DECIMAL = 10;

const failed = failedAt("ledger");

const db = drizzle(env.LEDGER);

const query = <Row>(run: () => Promise<Row>): Effect.Effect<Row, UpstreamFailed> =>
  Effect.tryPromise({ try: run, catch: failed });

const batch = <const Items extends Batch>(items: Items) => query(() => db.batch(items));

const dayRange = ({ from, to }: Period) => ({
  first: `${from}-${FIRST_DAY}`,
  last: `${to}-${LAST_DAY}`,
});

const summedAmount = sql<number>`sum(${transactions.amount})`.mapWith(Number);

const inPeriod = (period: Period) => {
  const { first, last } = dayRange(period);
  return and(gte(transactions.date, first), lte(transactions.date, last));
};

const fallbackSql = sql`CASE WHEN ${transactions.amount} > 0 THEN ${fallbackCategory(POSITIVE)} ELSE ${fallbackCategory(NEGATIVE)} END`;

const userRules: Effect.Effect<readonly Rule[], UpstreamFailed> = query(() =>
  db
    .select({
      pattern: categoryRules.pattern,
      category: categoryRules.category,
      label: categoryRules.label,
    })
    .from(categoryRules)
    .orderBy(asc(categoryRules.id)),
);

const recategorized = (rules: readonly Rule[]): Batch => [
  db
    .update(transactions)
    .set({ category: fallbackSql, label: null })
    .where(eq(transactions.manual, false)),
  ...Arr.map([...BUILT_IN_RULES, ...rules], ({ pattern, category, label }) =>
    db
      .update(transactions)
      .set({ category, label })
      .where(
        and(
          eq(transactions.manual, false),
          sql`instr(${transactions.normalized}, ${normalized(pattern)}) > 0`,
        ),
      ),
  ),
];

const accountNamed = (id: string): Effect.Effect<Account, Failure> =>
  query(() => db.select().from(accounts).where(eq(accounts.id, id)).limit(1)).pipe(
    Effect.flatMap((rows) =>
      Effect.fromOption(Arr.head(rows)).pipe(
        Effect.mapError(() => rejected(`口座 ${id} がありません。先に upsert_account で作る`)),
      ),
    ),
  );

const upsertAccount = (account: Account): Effect.Effect<Account, UpstreamFailed> =>
  query(() =>
    db
      .insert(accounts)
      .values(account)
      .onConflictDoUpdate({
        target: accounts.id,
        set: { name: account.name, class: account.class },
      }),
  ).pipe(Effect.as(account));

const byteLength = (text: string): number => new TextEncoder().encode(text).byteLength;

const chunked = (texts: readonly string[]): readonly (readonly string[])[] =>
  pipe(
    texts,
    Arr.reduce<readonly (readonly string[])[], string>([], (chunks, text) =>
      Option.match(Arr.last(chunks), {
        onSome: (last) =>
          byteLength(Arr.join([...last, text], ",")) <= CHUNK_BYTES
            ? [...Arr.dropRight(chunks, 1), [...last, text]]
            : [...chunks, [text]],
        onNone: () => [[text]],
      }),
    ),
  );

const insertChunk = (accountId: string, importId: string, rows: readonly string[]) =>
  db.all<{ id: number }>(sql`
    INSERT INTO ${transactions} (account_id, import_id, date, amount, description, normalized, memo, category, label, manual, hash)
    SELECT ${accountId}, ${importId},
      json_extract(value, '$.date'), json_extract(value, '$.amount'),
      json_extract(value, '$.description'), json_extract(value, '$.normalized'),
      json_extract(value, '$.memo'),
      CASE WHEN json_extract(value, '$.amount') > 0 THEN ${fallbackCategory(POSITIVE)} ELSE ${fallbackCategory(NEGATIVE)} END,
      NULL, 0, json_extract(value, '$.hash')
    FROM json_each(${`[${Arr.join(rows, ",")}]`}) WHERE true
    ON CONFLICT (hash) DO NOTHING
    RETURNING id`);

const importEntries = Effect.fn("importEntries")(function* importEntries(
  accountId: string,
  source: string,
  entries: readonly LedgerEntry[],
) {
  yield* accountNamed(accountId);
  const rows = yield* fingerprinted(accountId, entries);
  const rules = yield* userRules;
  const createdAt = yield* Clock.currentTimeMillis;
  const importId = crypto.randomUUID();
  const chunks = chunked(
    Arr.map(rows, ({ date, amount, description, normalized: text, memo, hash }) =>
      JSON.stringify({ date, amount, description, normalized: text, memo, hash }),
    ),
  );
  const inserts = Arr.map(chunks, (chunk) => insertChunk(accountId, importId, chunk));
  const results = yield* query(() =>
    db.batch([
      db.insert(imports).values({ id: importId, accountId, source, createdAt }),
      ...inserts,
      ...recategorized(rules),
      db
        .delete(imports)
        .where(
          and(
            eq(imports.id, importId),
            sql`NOT EXISTS (SELECT 1 FROM ${transactions} WHERE ${transactions.importId} = ${importId})`,
          ),
        ),
    ]),
  );
  const added = Num.sumAll(
    pipe(
      results,
      Arr.drop(1),
      Arr.take(inserts.length),
      Arr.map((result) => (Array.isArray(result) ? result.length : 0)),
    ),
  );
  return {
    importId: added > 0 ? importId : null,
    added,
    duplicates: rows.length - added,
  } satisfies Imported;
});

const deleteImport = (importId: string): Effect.Effect<Readonly<{ deleted: number }>, Failure> =>
  query(() =>
    db.batch([
      db
        .delete(transactions)
        .where(eq(transactions.importId, importId))
        .returning({ id: transactions.id }),
      db.delete(imports).where(eq(imports.id, importId)).returning({ id: imports.id }),
    ]),
  ).pipe(
    Effect.flatMap(([deletedRows, deletedImports]) =>
      Arr.isReadonlyArrayEmpty(deletedImports)
        ? Effect.fail(rejected(`取り込み ${importId} はありません`))
        : Effect.succeed({ deleted: deletedRows.length }),
    ),
  );

const recordBalance = Effect.fn("recordBalance")(function* recordBalance(
  accountId: string,
  date: string,
  balance: number,
) {
  yield* accountNamed(accountId);
  yield* query(() =>
    db
      .insert(balances)
      .values({ accountId, date, balance })
      .onConflictDoUpdate({ target: [balances.accountId, balances.date], set: { balance } }),
  );
  return { account: accountId, date, balance };
});

type CategoryChoice = Readonly<{
  transactionId: number;
  category: Category | "auto";
  label?: string;
}>;

const setCategory = Effect.fn("setCategory")(function* setCategory({
  transactionId,
  category,
  label,
}: CategoryChoice) {
  const where = eq(transactions.id, transactionId);
  const rules = yield* userRules;
  const [changed] = yield* category === "auto"
    ? batch([
        db
          .update(transactions)
          .set({ manual: false })
          .where(where)
          .returning({ id: transactions.id }),
        ...recategorized(rules),
      ])
    : batch([
        db
          .update(transactions)
          .set({ category, label: label ?? null, manual: true })
          .where(where)
          .returning({ id: transactions.id }),
      ]);
  if (Arr.isReadonlyArrayEmpty(changed)) {
    return yield* rejected(`取引 ${transactionId} はありません`);
  }
  const [row] = yield* query(() =>
    db
      .select({
        category: transactions.category,
        label: transactions.label,
        manual: transactions.manual,
      })
      .from(transactions)
      .where(where),
  );
  return { transactionId, ...row };
});

const replaced = (rules: readonly Rule[], rule: Rule): readonly Rule[] =>
  Arr.some(rules, ({ pattern }) => pattern === rule.pattern)
    ? Arr.map(rules, (current) => (current.pattern === rule.pattern ? rule : current))
    : [...rules, rule];

const setRule = Effect.fn("setRule")(function* setRule(rule: Rule) {
  const pattern = normalized(rule.pattern);
  const saved = { ...rule, pattern };
  const rules = replaced(yield* userRules, saved);
  yield* batch([
    db
      .insert(categoryRules)
      .values(saved)
      .onConflictDoUpdate({
        target: categoryRules.pattern,
        set: { category: saved.category, label: saved.label },
      }),
    ...recategorized(rules),
  ]);
  return saved;
});

const deleteRule = Effect.fn("deleteRule")(function* deleteRule(text: string) {
  const pattern = normalized(text);
  const rules = yield* userRules;
  if (!Arr.some(rules, (rule) => rule.pattern === pattern)) {
    return yield* rejected(`規則 ${pattern} はありません`);
  }
  yield* batch([
    db.delete(categoryRules).where(eq(categoryRules.pattern, pattern)),
    ...recategorized(Arr.filter(rules, (rule) => rule.pattern !== pattern)),
  ]);
  return { deleted: pattern };
});

const cursorOf = ({ date, id }: Readonly<{ date: string; id: number }>): string => `${date}|${id}`;

const afterCursor = (cursor: string) => {
  const [date = "", id = ""] = cursor.split("|");
  const position = Number.parseInt(id, DECIMAL);
  return or(
    lt(transactions.date, date),
    and(eq(transactions.date, date), lt(transactions.id, position)),
  );
};

const listTransactions = (
  filter: TransactionFilter,
): Effect.Effect<TransactionPage, UpstreamFailed> => 
  query(() =>
    db
      .select({
        id: transactions.id,
        accountId: transactions.accountId,
        importId: transactions.importId,
        date: transactions.date,
        amount: transactions.amount,
        description: transactions.description,
        memo: transactions.memo,
        category: transactions.category,
        label: transactions.label,
        manual: transactions.manual,
      })
      .from(transactions)
      .where(
        and(
          inPeriod(filter),
          ...Arr.getSomes([
            Option.map(Option.fromNullishOr(filter.account), (account) =>
              eq(transactions.accountId, account),
            ),
            Option.map(Option.fromNullishOr(filter.category), (category) =>
              eq(transactions.category, category),
            ),
            Option.map(Option.fromNullishOr(filter.cursor), afterCursor),
          ]),
        ),
      )
      .orderBy(desc(transactions.date), desc(transactions.id))
      .limit(PAGE_SIZE + 1),
  ).pipe(
    Effect.map((rows) => {
      const page = Arr.take(rows, PAGE_SIZE);
      return {
        transactions: page,
        next:
          rows.length > PAGE_SIZE ? Option.getOrNull(Option.map(Arr.last(page), cursorOf)) : null,
      };
    }),
  )
;

const categoryTotals = (period: Period): Effect.Effect<readonly CategoryTotal[], UpstreamFailed> =>
  query(() =>
    db
      .select({ category: transactions.category, label: transactions.label, amount: summedAmount })
      .from(transactions)
      .where(inPeriod(period))
      .groupBy(transactions.category, transactions.label),
  );

const monthOfDate = sql<string>`substr(${transactions.date}, 1, 7)`;

const monthTotals = (period: Period): Effect.Effect<readonly MonthTotal[], UpstreamFailed> =>
  query(() =>
    db
      .select({ month: monthOfDate, category: transactions.category, amount: summedAmount })
      .from(transactions)
      .where(inPeriod(period))
      .groupBy(monthOfDate, transactions.category),
  );

const latestOnOrBefore = <Row extends Readonly<{ date: string }>>(rows: readonly Row[]) =>
  Arr.last(
    Arr.sort(
      rows,
      Order.mapInput(Order.String, ({ date }: Row) => date),
    ),
  );

const positions = Effect.fn("positions")(function* positions(asOf: string) {
  const [accountRows, balanceRows, dailyRows] = yield* batch([
    db.select().from(accounts).orderBy(asc(accounts.id)),
    db.select().from(balances).where(lte(balances.date, asOf)),
    db
      .select({
        accountId: transactions.accountId,
        date: transactions.date,
        amount: summedAmount,
      })
      .from(transactions)
      .where(lte(transactions.date, asOf))
      .groupBy(transactions.accountId, transactions.date),
  ]);
  return Arr.map(accountRows, (account): AccountPosition => {
    const snapshot = Option.getOrNull(
      Option.map(
        latestOnOrBefore(Arr.filter(balanceRows, ({ accountId }) => accountId === account.id)),
        ({ date, balance }) => ({ date, balance }),
      ),
    );
    const movement = Num.sumAll(
      pipe(
        dailyRows,
        Arr.filter(
          ({ accountId, date }) =>
            accountId === account.id && (snapshot === null || date > snapshot.date),
        ),
        Arr.map(({ amount }) => amount),
      ),
    );
    return { id: account.id, name: account.name, class: account.class, snapshot, movement };
  });
});

const settings = Effect.gen(function* settings() {
  const [accountRows] = yield* batch([db.select().from(accounts).orderBy(asc(accounts.id))]);
  const rules = yield* userRules;
  return {
    accounts: accountRows,
    categories: Arr.map(CATEGORIES, (id) => ({
      id,
      label: CATEGORY_LABELS[id],
      flow: flowOf(id),
    })),
    rules: [
      ...Arr.map(BUILT_IN_RULES, (rule) => ({ ...rule, builtIn: true })),
      ...Arr.map(rules, (rule) => ({ ...rule, builtIn: false })),
    ],
  };
});

export {
  categoryTotals,
  deleteImport,
  deleteRule,
  importEntries,
  listTransactions,
  monthTotals,
  positions,
  recordBalance,
  setCategory,
  setRule,
  settings,
  upsertAccount,
};
export type {
  Account,
  CategoryChoice,
  Failure,
  LedgerEntry,
  Period,
  Transaction,
  TransactionFilter,
  TransactionPage,
};
