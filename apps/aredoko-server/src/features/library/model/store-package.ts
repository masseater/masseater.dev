import { Effect } from "effect";
import { SqlClient } from "effect/sql";

import { encodeSummary } from "#entities/package";
import type { SummaryEntry } from "#entities/package";

import { embedTexts } from "./embed-texts.ts";
import { insertAssets } from "./insert-assets.ts";
import type { AssetInput } from "./insert-assets.ts";
import { labelOf } from "./name.ts";
import { boothOf, insertPackage } from "./package-row.ts";
import type { PackageFile } from "./package-row.ts";

/** @internal */
const storePackage = Effect.fn("storePackage")(function* storePackageRows({
  kind,
  file,
  name,
  entries,
  assets,
}: {
  readonly kind: "unitypackage" | "files";
  readonly file: PackageFile;
  readonly name: string;
  readonly entries: readonly SummaryEntry[];
  readonly assets: readonly AssetInput[];
}) {
  const sql = yield* SqlClient.SqlClient;
  const summary = yield* encodeSummary({ name, entries });
  const booth = yield* boothOf(file.path);
  const packageName = labelOf({ name, booth });
  const packageId = yield* sql.withTransaction(
    Effect.gen(function* write() {
      const id = yield* insertPackage({ kind, file, name, summary, booth });
      yield* insertAssets({ packageId: id, packageName, assets });
      return id;
    }),
  );
  yield* embedTexts(packageId);
});

export { storePackage };
