import { Array, Effect, Option, pipe } from "effect";

import { kindOf, listedEntry } from "#/entities/package/index.ts";
import { readPackage } from "#/shared/unitypackage/index.ts";
import type { PackageEntry } from "#/shared/unitypackage/index.ts";

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
  render: kindOf(pathname) === "model",
});

/** @internal */
export const indexPackage = Effect.fn("indexPackage")(function* indexPackageFile(
  file: PackageFile,
  linkable: boolean,
) {
  const read = yield* readPackage(file.path);
  const entries = pipe(
    read,
    Array.filter(({ hasAsset }) => hasAsset),
  );
  yield* storePackage({
    kind: "unitypackage",
    file,
    name: nameOf(file.path),
    entries,
    assets: pipe(entries, Array.map(packagedAsset)),
    linkable,
  });
});

/** @internal */
export const indexBundle = Effect.fn("indexBundle")(function* indexLooseFiles(
  bundle: Bundle,
  linkable: boolean,
) {
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
    linkable,
  });
});
