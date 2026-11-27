import { D1 } from "@alchemy.run/cloudflare";
import { RemovalPolicy } from "alchemy";
import { Effect, Option } from "effect";

import { JAPAN_DATABASE_HINT } from "#/shared/config/index.ts";

export interface JapanDatabaseProps {
  readonly migrations: string;
  readonly name: Option.Option<string>;
}

const named = (name: Option.Option<string>, suffix: string): { readonly name?: string } =>
  Option.match(name, { onNone: () => ({}), onSome: (base) => ({ name: `${base}${suffix}` }) });

export const japanDatabase = Effect.fn("japanDatabase")(function* japanDatabase(
  id: string,
  { migrations, name }: JapanDatabaseProps,
) {
  const legacy = yield* D1.Database(id, { ...named(name, ""), migrations }).pipe(
    RemovalPolicy.destroy(),
  );
  return yield* D1.Database(`${id}Japan`, {
    ...named(name, "-japan"),
    primaryLocationHint: JAPAN_DATABASE_HINT,
    migrations,
    clone: legacy,
  }).pipe(RemovalPolicy.protect());
});
