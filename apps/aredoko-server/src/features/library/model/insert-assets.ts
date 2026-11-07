import { Effect, Option, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { kindOf, searchableText } from "#entities/package";
import { RENDER } from "#shared/database";
import { firstId } from "#shared/sql";

interface AssetInput {
  readonly guid: string;
  readonly pathname: string;
  readonly previews: readonly Uint8Array[];
  readonly references: readonly string[];
  readonly file: Option.Option<string>;
  readonly render: boolean;
}

interface OneAsset {
  readonly packageId: number;
  readonly packageName: string;
  readonly asset: AssetInput;
}

const plainAsset = ({
  guid,
  pathname,
  previews,
}: Readonly<{ guid: string; pathname: string; previews: readonly Uint8Array[] }>): AssetInput => ({
  guid,
  pathname,
  previews,
  references: [],
  file: Option.none(),
  render: false,
});

const renderState = (render: boolean): number =>
  pipe(
    Option.liftPredicate(RENDER.pending, () => render),
    Option.getOrElse(() => RENDER.none),
  );

const insertAsset = Effect.fn("insertAsset")(function* insertOneAsset({
  packageId,
  packageName,
  asset: { guid, pathname, previews, references, file, render },
}: OneAsset) {
  const sql = yield* SqlClient.SqlClient;
  const kind = kindOf(pathname);
  const text = searchableText({ pathname, kind, packageName });
  yield* sql`delete from assets where package_id = ${packageId} and guid = ${guid}`;
  const id = yield* firstId(
    sql`insert into assets(package_id, guid, pathname, kind, text, file, render)
      values (${packageId}, ${guid}, ${pathname}, ${kind}, ${text}, ${Option.getOrNull(file)},
        ${renderState(render)}) returning id`,
  );
  yield* pipe(
    previews,
    Effect.forEach((png) => sql`insert into images(asset_id, png) values (${id}, ${png})`),
  );
  yield* pipe(
    references,
    Effect.forEach(
      (reference) =>
        sql`insert or ignore into asset_references(asset_id, guid) values (${id}, ${reference})`,
    ),
  );
});

/** @internal */
const insertAssets = Effect.fn("insertAssets")(function* insertAllAssets({
  packageId,
  packageName,
  assets,
}: {
  readonly packageId: number;
  readonly packageName: string;
  readonly assets: readonly AssetInput[];
}) {
  yield* pipe(
    assets,
    Effect.forEach((asset) => insertAsset({ packageId, packageName, asset })),
  );
});

export { insertAssets, plainAsset };
export type { AssetInput };
