import { Array, Effect, Option, pipe } from "effect";

import { listedEntry } from "#entities/package";
import { readPackage } from "#shared/unitypackage";
import type { PackageEntry } from "#shared/unitypackage";

import { plainAsset } from "./insert-assets.ts";
import type { AssetInput } from "./insert-assets.ts";
import { looseAsset } from "./loose-asset.ts";
import type { Bundle } from "./loose-files.ts";
import { nameOf } from "./name.ts";
import type { PackageFile } from "./package-row.ts";
import { storePackage } from "./store-package.ts";

const packagedAsset = ({ guid, pathname, preview, references }: PackageEntry): AssetInput => ({
  ...plainAsset({ guid, pathname, previews: Option.toArray(preview) }),
  references,
});

/** @internal */
const indexPackage = Effect.fn("indexPackage")(function* indexPackageFile(file: PackageFile) {
  const read = yield* readPackage(file.path);
  const entries = pipe(
    read,
    Array.filter(({ asset }) => Option.isSome(asset)),
  );
  yield* storePackage({
    kind: "unitypackage",
    file,
    name: nameOf(file.path),
    entries,
    assets: pipe(entries, Array.map(packagedAsset)),
  });
});

/** @internal */
const indexBundle = Effect.fn("indexBundle")(function* indexLooseFiles(bundle: Bundle) {
  const assets = yield* pipe(bundle.members, Effect.forEach(looseAsset));
  yield* storePackage({
    kind: "files",
    file: bundle,
    name: bundle.name,
    entries: pipe(
      bundle.members,
      Array.map(({ pathname }) => listedEntry({ guid: pathname, pathname })),
    ),
    assets,
  });
});

export { indexBundle, indexPackage };
