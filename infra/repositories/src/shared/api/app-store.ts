import { Effect, Option, Schema } from "effect";

import { SealFailed, seal, unseal } from "#/shared/lib/sealed-value.ts";

const SELECT = "SELECT value FROM github_app WHERE key = ?";
const UPSERT =
  "INSERT INTO github_app (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value";
const SWAP = `${UPSERT} WHERE github_app.value = ? RETURNING key`;
const ABSENT = "";

export type BoundStatement = Readonly<{
  first: (column: string) => Promise<unknown>;
  run: () => Promise<unknown>;
}>;

export type AppStoreEnv = Readonly<{
  GITHUB_APP: Readonly<{
    prepare: (
      query: string,
    ) => Readonly<{ bind: (...values: readonly string[]) => BoundStatement }>;
  }>;
  SEAL_KEY: string;
}>;

export type StoreRow = Readonly<{ env: AppStoreEnv; name: string }>;

export type SealedEntry = StoreRow & Readonly<{ plaintext: string }>;

export type RowSwap = StoreRow & Readonly<{ expected: Option.Option<string>; value: string }>;

export type SealedSwap = SealedEntry & Readonly<{ expected: Option.Option<string> }>;

const decodeCell = Schema.decodeUnknownEffect(Schema.NullOr(Schema.String));

const cell = (bound: BoundStatement, column: string): Effect.Effect<Option.Option<string>> =>
  Effect.promise(() => bound.first(column)).pipe(
    Effect.flatMap(decodeCell),
    Effect.orDie,
    Effect.map(Option.fromNullishOr),
  );

export const readRow = ({ env, name }: StoreRow): Effect.Effect<Option.Option<string>> =>
  cell(env.GITHUB_APP.prepare(SELECT).bind(name), "value");

const absentOr = Option.getOrElse(() => ABSENT);

export const swapRow = ({ env, name, expected, value }: RowSwap): Effect.Effect<boolean> =>
  cell(env.GITHUB_APP.prepare(SWAP).bind(name, value, absentOr(expected)), "key").pipe(
    Effect.map(Option.isSome),
  );

const mismatched = (): SealFailed =>
  SealFailed.make({ message: "the sealed value did not open to what was sealed" });

const sealChecked = ({ env, name, plaintext }: SealedEntry): Effect.Effect<string, SealFailed> =>
  Effect.gen(function* sealAndOpen() {
    const sealing = { key: env.SEAL_KEY, name };
    const stored = yield* seal({ ...sealing, plaintext });
    const opened = yield* unseal({ ...sealing, stored });
    if (opened.status === "sealed" && opened.plaintext === plaintext) {
      return stored;
    }
    return yield* mismatched();
  });

export const writeSealed = (entry: SealedEntry): Effect.Effect<void, SealFailed> =>
  sealChecked(entry).pipe(
    Effect.flatMap((stored) =>
      Effect.promise(() => entry.env.GITHUB_APP.prepare(UPSERT).bind(entry.name, stored).run()),
    ),
    Effect.asVoid,
  );

export const swapSealed = (entry: SealedSwap): Effect.Effect<boolean, SealFailed> =>
  sealChecked(entry).pipe(Effect.flatMap((value) => swapRow({ ...entry, value })));

const migrationFailed = (name: string, reason: string): Effect.Effect<void> =>
  Effect.logWarning("app_store.migration_failed").pipe(Effect.annotateLogs({ name, reason }));

const migrate = (entry: SealedEntry): Effect.Effect<void> =>
  sealChecked(entry).pipe(
    Effect.flatMap((value) => swapRow({ ...entry, expected: Option.some(entry.plaintext), value })),
    Effect.flatMap((migrated) =>
      Effect.logInfo("app_store.migrated").pipe(
        Effect.annotateLogs({ name: entry.name, migrated }),
      ),
    ),
    Effect.catchTag("SealFailed", ({ message }) => migrationFailed(entry.name, message)),
    Effect.catchCause(() => migrationFailed(entry.name, "the store rejected the write")),
  );

const opened = (row: StoreRow, stored: string): Effect.Effect<Option.Option<string>, SealFailed> =>
  unseal({ key: row.env.SEAL_KEY, name: row.name, stored }).pipe(
    Effect.tapError(({ message }) =>
      Effect.logError("app_store.unreadable").pipe(
        Effect.annotateLogs({ name: row.name, reason: message }),
      ),
    ),
    Effect.tap(({ status, plaintext }) => {
      if (status === "legacy") {
        return migrate({ ...row, plaintext });
      }
      return Effect.void;
    }),
    Effect.map(({ plaintext }) => Option.some(plaintext)),
  );

export const readSealed = (row: StoreRow): Effect.Effect<Option.Option<string>, SealFailed> =>
  readRow(row).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeedNone,
        onSome: (stored) => opened(row, stored),
      }),
    ),
  );
