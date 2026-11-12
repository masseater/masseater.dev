import { RequestFailed } from "@masseater.dev/aredoko-protocol";
import type { ProjectAsset } from "@masseater.dev/aredoko-protocol";
import { failed } from "@masseater.dev/local-server";
import { Array, Effect, Option, Path, pipe } from "effect";

import { fetchItem } from "#entities/booth";
import { packagesWhere } from "#entities/package";
import { extract } from "#features/extract";
import { findAssetStore } from "#features/intake";
import { Blm, Library, linkBooth, pruneProject, putProjectAssets } from "#features/library";
import { Settings } from "#shared/settings";

import { firstOr } from "./request-failed.ts";

const EXTRACTED_DIRECTORY = "extracted";
const NO_PACKAGE = "パッケージが見つかりません";
const INVALID_BOOTH_URL = "BOOTH の商品ページの URL を入力してください";

/** @internal */
const listPackages = Effect.fn("ListPackages")(function* listRequest() {
  const packages = yield* failed(Option.none<number>().pipe(packagesWhere));
  return { packages };
});

/** @internal */
const packageById = Effect.fn("packageById")(function* selectPackage(id: number) {
  return yield* firstOr(NO_PACKAGE)(Option.some(id).pipe(packagesWhere));
});

/** @internal */
const extractAssets = Effect.fn("Extract")(function* extractRequest({
  assetIds,
}: {
  readonly assetIds: readonly number[];
}) {
  const { dataDirectory } = yield* Settings;
  const path = yield* Path.Path;
  return yield* failed(extract(assetIds, path.join(dataDirectory, EXTRACTED_DIRECTORY)));
});

/** @internal */
const linkBoothItem = Effect.fn("LinkBooth")(function* linkRequest({
  packageId,
  url,
}: {
  readonly packageId: number;
  readonly url: string;
}) {
  const item = yield* fetchItem(url).pipe(
    Effect.catchTag("InvalidBoothUrl", () =>
      Effect.fail(RequestFailed.make({ reason: "Invalid", message: INVALID_BOOTH_URL })),
    ),
    failed,
  );
  yield* failed(linkBooth({ packageId, item }));
  return yield* packageById(packageId);
});

/** @internal */
const putAssets = Effect.fn("PutProjectAssets")(function* putRequest({
  projectPath,
  assets,
  complete,
}: {
  readonly projectPath: string;
  readonly assets: readonly (typeof ProjectAsset.Type)[];
  readonly complete: boolean;
}) {
  const library = yield* Library;
  const packageId = yield* failed(putProjectAssets({ projectPath, assets }));
  const guids = pipe(
    assets,
    Array.map(({ guid }) => guid),
  );
  const seen = yield* library.remember({ projectPath, guids });
  if (complete) {
    yield* failed(pruneProject({ packageId, projectPath, seen }));
    yield* library.forget(projectPath);
    yield* library.requestScan;
  }
});

/** @internal */
const libraryInfo = Effect.fn("GetLibrary")(function* libraryInfo(libraryPath: string) {
  const blm = yield* Blm;
  const [assetStore, blmLibrary] = yield* failed(Effect.all([findAssetStore(), blm.library]));
  return {
    path: libraryPath,
    assetStore: Option.getOrNull(assetStore),
    blm: pipe(
      blmLibrary,
      Option.map(({ itemDirectory }) => itemDirectory),
      Option.getOrNull,
    ),
  };
});

export { extractAssets, libraryInfo, linkBoothItem, listPackages, packageById, putAssets };
