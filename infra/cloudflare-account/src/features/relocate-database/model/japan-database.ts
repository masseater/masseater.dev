import { D1 } from "@alchemy.run/cloudflare";
import { RemovalPolicy } from "alchemy";
import { succeed } from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import { Effect, Option } from "effect";

import { copyRows } from "#/shared/api/index.ts";
import { JAPAN_DATABASE_HINT } from "#/shared/config/index.ts";

const COPY_ROWS = "Masseater.CopyRows";

type CopyRowsProps = Readonly<{ source: string; target: string }>;

type CopyRowsResource = Resource<typeof COPY_ROWS, CopyRowsProps, CopyRowsProps>;

const CopyRows = Resource<CopyRowsResource>(COPY_ROWS);

export interface JapanDatabaseProps {
  readonly migrations: string;
  readonly name: Option.Option<string>;
}

const named = (name: Option.Option<string>, suffix: string): { readonly name?: string } =>
  Option.match(name, { onNone: () => ({}), onSome: (base) => ({ name: `${base}${suffix}` }) });

/** @internal */
export const copyRowsProvider = succeed(CopyRows, {
  reconcile: ({ news }) =>
    copyRows(news.source, news.target).pipe(
      Effect.as({ source: news.source, target: news.target }),
    ),
  delete: () => Effect.void,
});

export const japanDatabase = Effect.fn("japanDatabase")(function* japanDatabase(
  id: string,
  { migrations, name }: JapanDatabaseProps,
) {
  const legacy = yield* D1.Database(id, { ...named(name, ""), migrations }).pipe(
    RemovalPolicy.destroy(),
  );
  const japan = yield* D1.Database(`${id}Japan`, {
    ...named(name, "-japan"),
    primaryLocationHint: JAPAN_DATABASE_HINT,
    migrations,
  }).pipe(RemovalPolicy.protect());
  yield* CopyRows(`${id}Rows`, { source: legacy.databaseId, target: japan.databaseId });
  return japan;
});
