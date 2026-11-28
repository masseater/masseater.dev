import { D1 } from "@alchemy.run/cloudflare";
import { RemovalPolicy } from "alchemy";
import { succeed } from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import { Effect } from "effect";

import { copyRows } from "#/features/relocate-database/api/copy-rows.ts";

const JAPAN_HINT = "apac";
const COPY_ROWS = "Masseater.CopyRows";

type CopyRowsProps = Readonly<{ source: string; target: string }>;

type CopyRowsResource = Resource<typeof COPY_ROWS, CopyRowsProps, CopyRowsProps>;

const CopyRows = Resource<CopyRowsResource>(COPY_ROWS);

/** @internal */
export const copyRowsProvider = succeed(CopyRows, {
  reconcile: ({ news }) =>
    copyRows(news.source, news.target).pipe(
      Effect.as({ source: news.source, target: news.target }),
    ),
  delete: () => Effect.void,
});

export const relocatedDatabase = Effect.fn("relocatedDatabase")(function* relocatedDatabase(
  id: string,
  { migrations, name }: Readonly<{ migrations: string; name: string }>,
) {
  const legacy = yield* D1.Database(id, { name, migrations }).pipe(RemovalPolicy.destroy());
  const japan = yield* D1.Database(`${id}Japan`, {
    name: `${name}-japan`,
    primaryLocationHint: JAPAN_HINT,
    migrations,
  }).pipe(RemovalPolicy.protect());
  yield* CopyRows(`${id}Rows`, { source: legacy.databaseId, target: japan.databaseId });
  return japan;
});
