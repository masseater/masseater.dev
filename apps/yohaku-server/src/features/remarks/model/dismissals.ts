import type { Remark } from "@masseater.dev/yohaku-protocol";
import { Array, Effect, HashSet, Schema, pipe } from "effect";
import { SqlClient, SqlSchema } from "effect/sql";

const Dismissal = Schema.Struct({ text: Schema.String, rule: Schema.String });

const SEPARATOR = "\u0000";

const keyOf = ({ text, rule }: Readonly<{ text: string; rule: string }>): string =>
  `${rule}${SEPARATOR}${text}`;

const selectDismissals = SqlSchema.findAll({
  Request: Schema.Void,
  Result: Dismissal,
  execute: () =>
    SqlClient.SqlClient.pipe(Effect.flatMap((sql) => sql`select text, rule from dismissals`)),
});

/** @internal */
const dismiss = Effect.fn("dismiss")(function* dismiss({
  text,
  rule,
}: Readonly<{ text: string; rule: string }>) {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`insert into dismissals (text, rule) values (${text}, ${rule}) on conflict do nothing`;
});

/** @internal */
const withoutDismissed = Effect.fn("withoutDismissed")(function* withoutDismissed({
  remarks,
  textOf,
}: Readonly<{
  remarks: readonly (typeof Remark.Type)[];
  textOf: (remark: typeof Remark.Type) => string;
}>) {
  const rows = yield* selectDismissals();
  const dismissed = pipe(rows, Array.map(keyOf), HashSet.fromIterable);
  return pipe(
    remarks,
    Array.filter(
      (remark) => !HashSet.has(dismissed, keyOf({ text: textOf(remark), rule: remark.rule })),
    ),
  );
});

export { dismiss, withoutDismissed };
