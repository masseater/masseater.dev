import { expect, layer } from "@effect/vitest";
import { Effect, Result, Schema } from "effect";
import { Base64 } from "effect/encoding";
import { SqlClient } from "effect/sql";

import { EMBEDDING } from "#shared/database";
import { Embedder } from "#shared/embedding";
import { decodeRows, firstId } from "#shared/sql";

import { embedderOf, indexInTemporaryFolder, recordingEmbedder } from "./library.test.support.ts";
import { putProjectAssets } from "./project-assets.ts";

const PROJECT = "/projects/World";
const pngFromBase64 = (base64: string): Uint8Array => Result.getOrThrow(Base64.decode(base64));

const RED_PIXEL = pngFromBase64(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWP4z8AAAAMBAQCc479ZAAAAAElFTkSuQmCC",
);
const BLUE_PIXEL = pngFromBase64(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWNgYPgPAAEDAQBdlO9aAAAAAElFTkSuQmCC",
);

interface Asset {
  readonly guid: string;
  readonly pathname: string;
  readonly previews: readonly Uint8Array[];
}

const WALL: Asset = {
  guid: "0123456789abcdef0123456789abcdef",
  pathname: "Assets/World/wall.png",
  previews: [RED_PIXEL],
};

const ROOF: Asset = {
  guid: "fedcba9876543210fedcba9876543210",
  pathname: "Assets/World/roof.mat",
  previews: [],
};

const REPAINTED_WALL: Asset = { ...WALL, previews: [BLUE_PIXEL] };

const AssetRow = Schema.Struct({ id: Schema.Int, guid: Schema.String });

const ImageRow = Schema.Struct({ id: Schema.Int, asset_id: Schema.Int, embedded: Schema.Int });

const OwnerRow = Schema.Struct({ asset_id: Schema.Int, embedded: Schema.Int });

const stored = Effect.gen(function* stored() {
  const sql = yield* SqlClient.SqlClient;
  const assets = yield* decodeRows(AssetRow)(sql`select id, guid from assets order by guid`);
  const images = yield* decodeRows(ImageRow)(
    sql`select id, asset_id, embedded from images order by id`,
  );
  return { assets, images };
});

const assetIdOf = Effect.fn("assetIdOf")(function* assetIdOf(guid: string) {
  const sql = yield* SqlClient.SqlClient;
  return yield* firstId(sql`select id from assets where guid = ${guid}`);
});

const imageOwners = Effect.gen(function* imageOwners() {
  const sql = yield* SqlClient.SqlClient;
  return yield* decodeRows(OwnerRow)(sql`select asset_id, embedded from images order by id`);
});

const assetIds = Effect.all([assetIdOf(WALL.guid), assetIdOf(ROOF.guid)]);

const register = Effect.fn("register")(function* register(
  assets: readonly Asset[],
  embedder: typeof Embedder.Service,
) {
  yield* putProjectAssets({ projectPath: PROJECT, assets }).pipe(
    Effect.provideService(Embedder, embedder),
  );
});

const markEmbedded = Effect.gen(function* markEmbedded() {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`update images set embedded = ${EMBEDDING.done}`;
});

layer(indexInTemporaryFolder, { excludeTestServices: true })(
  "putProjectAssets with the same assets again",
  (it) => {
    it.effect("変わっていないアセットは行と埋め込みを残す", () =>
      Effect.gen(function* keepsUnchanged() {
        const { embedder, texts } = yield* recordingEmbedder;
        const put = register([WALL, ROOF], embedder);
        yield* put;
        yield* markEmbedded;
        const before = yield* stored;
        yield* put;
        const after = yield* stored;
        expect(after).toStrictEqual(before);
        const embedded = yield* texts;
        expect(embedded).toHaveLength(before.assets.length);
      }),
    );
  },
);

layer(indexInTemporaryFolder, { excludeTestServices: true })(
  "putProjectAssets with a changed asset",
  (it) => {
    it.effect("プレビューの変わったアセットだけを入れ直す", () =>
      Effect.gen(function* replacesChanged() {
        yield* register([WALL, ROOF], embedderOf({}));
        yield* markEmbedded;
        const [wallBefore, roofBefore] = yield* assetIds;
        yield* register([REPAINTED_WALL, ROOF], embedderOf({}));
        const [wallAfter, roofAfter] = yield* assetIds;
        expect(roofAfter).toBe(roofBefore);
        expect(wallAfter).not.toBe(wallBefore);
        const owners = yield* imageOwners;
        expect(owners).toStrictEqual([{ asset_id: wallAfter, embedded: EMBEDDING.pending }]);
      }),
    );
  },
);
