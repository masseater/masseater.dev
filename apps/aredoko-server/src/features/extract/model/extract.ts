import {
  Array,
  Clock,
  Effect,
  FileSystem,
  HashMap,
  HashSet,
  Number,
  Option,
  Path,
  Record,
  Schema,
  pipe,
} from "effect";
import { SqlClient } from "effect/sql";

import { decodeRows } from "#shared/sql";
import { writePackage } from "#shared/unitypackage";

import { closure, missingOf } from "./closure.ts";
import { looseEntries } from "./loose-entries.ts";

const ReferenceRow = Schema.Struct({
  path: Schema.String,
  guid: Schema.String,
  reference: Schema.NullOr(Schema.String),
});

const SelectedRow = Schema.Struct({ package_id: Schema.Int, guid: Schema.String });

type Selected = typeof SelectedRow.Type;

type ReferenceRecord = typeof ReferenceRow.Type;

interface PlanInput {
  readonly packageId: number;
  readonly selected: readonly Selected[];
}

const selectedAssets = Effect.fn("selectedAssets")(function* selectAssets(
  assetIds: readonly number[],
) {
  const sql = yield* SqlClient.SqlClient;
  return yield* Array.match(assetIds, {
    onEmpty: () => Effect.succeed<readonly Selected[]>([]),
    onNonEmpty: (ids) =>
      decodeRows(SelectedRow)(
        sql`select a.package_id, a.guid from assets a join packages p on p.id = a.package_id
          where p.kind = 'unitypackage' and ${sql.in("a.id", ids)}`,
      ),
  });
});

const targetsOf = (group: readonly ReferenceRecord[]): readonly string[] =>
  pipe(
    group,
    Array.map(({ reference }) => Option.fromNullOr(reference)),
    Array.getSomes,
  );

const referencesOf = (
  rows: readonly ReferenceRecord[],
): HashMap.HashMap<string, readonly string[]> =>
  pipe(
    rows,
    Array.groupBy(({ guid }) => guid),
    Record.map(targetsOf),
    Record.toEntries,
    HashMap.fromIterable,
  );

const planOf = Effect.fn("planOf")(function* plan({ packageId, selected }: PlanInput) {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* decodeRows(ReferenceRow)(
    sql`select p.path, a.guid, r.guid as reference
      from assets a join packages p on p.id = a.package_id
      left join asset_references r on r.asset_id = a.id
      where a.package_id = ${packageId}`,
  );
  const references = referencesOf(rows);
  const roots = pipe(
    selected,
    Array.filter(({ package_id: id }) => id === packageId),
    Array.map(({ guid }) => guid),
  );
  const included = closure({ roots, references });
  const source = yield* Effect.fromOption(Array.head(rows));
  return { source: source.path, guids: included, missing: missingOf({ included, references }) };
});

const destinationIn = Effect.fn("destinationIn")(function* destinationIn(directory: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* fileSystem.makeDirectory(directory, { recursive: true });
  const now = yield* Clock.currentTimeMillis;
  return path.join(directory, `aredoko-${now.toString()}.unitypackage`);
});

/** @internal */
const extract = Effect.fn("extract")(function* extractAssets(
  assetIds: readonly number[],
  directory: string,
) {
  const selected = yield* selectedAssets(assetIds);
  const packageIds = pipe(
    selected,
    Array.map(({ package_id: id }) => id),
    Array.dedupe,
  );
  const plans = yield* pipe(
    packageIds,
    Effect.forEach((packageId) => planOf({ packageId, selected })),
  );
  const destination = yield* destinationIn(directory);
  const loose = yield* looseEntries(assetIds);
  yield* writePackage(plans, loose, destination);
  return {
    path: destination,
    assets: Number.sumAll([
      ...pipe(
        plans,
        Array.map(({ guids }) => HashSet.size(guids)),
      ),
      loose.length,
    ]),
    missing: pipe(
      plans,
      Array.flatMap(({ missing }) => missing),
      Array.dedupe,
    ),
  };
});

export { extract };
