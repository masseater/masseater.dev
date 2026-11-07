import { NodeServices } from "@effect/platform-node";
import { expect, layer } from "@effect/vitest";
import { Array, Effect, FileSystem, Option, Path, pipe } from "effect";
import { packTar } from "modern-tar";

import { readPackage } from "./read-package.ts";
import type { PackageEntry } from "./read-package.ts";

const encoder = new TextEncoder();

interface FixtureAsset {
  readonly guid: string;
  readonly pathname: string;
  readonly asset: Option.Option<Uint8Array>;
  readonly meta: Option.Option<string>;
  readonly preview: Option.Option<Uint8Array>;
}

interface FixtureFile {
  readonly header: { readonly name: string; readonly size: number; readonly type: "file" };
  readonly body: Uint8Array;
}

const file =
  (name: string) =>
  (body: Uint8Array): FixtureFile => ({
    header: { name, size: body.byteLength, type: "file" },
    body,
  });

const encode = (text: string): Uint8Array => encoder.encode(text);

const fileIn =
  (guid: string) =>
  ([name, body]: readonly [string, Option.Option<Uint8Array>]): Option.Option<FixtureFile> =>
    pipe(body, Option.map(file(`${guid}/${name}`)));

const filesOf = ({ guid, pathname, asset, meta, preview }: FixtureAsset): readonly FixtureFile[] =>
  pipe(
    [
      ["pathname", Option.some(encode(pathname))],
      ["asset", asset],
      ["asset.meta", pipe(meta, Option.map(encode))],
      ["preview.png", preview],
    ] as const,
    Array.map(fileIn(guid)),
    Array.getSomes,
  );

const gzip = (bytes: Uint8Array): Promise<Uint8Array> =>
  new Response(
    new Blob([Uint8Array.from(bytes)]).stream().pipeThrough(new CompressionStream("gzip")),
  ).bytes();

const writeFixture = Effect.fn("writeFixture")(function* writeFixturePackage(
  path: string,
  assets: readonly FixtureAsset[],
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const files = pipe(assets, Array.flatMap(filesOf));
  const tar = yield* Effect.promise(() => packTar(files));
  const archive = yield* Effect.promise(() => gzip(tar));
  yield* fileSystem.writeFile(path, archive);
});

const TEXTURE = "0123456789abcdef0123456789abcdef";
const MATERIAL = "fedcba9876543210fedcba9876543210";
const PREVIEW = encoder.encode("png");

const fixture = Effect.gen(function* fixture() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const directory = yield* fileSystem.makeTempDirectoryScoped();
  const archive = path.join(directory, "fixture.unitypackage");
  yield* writeFixture(archive, [
    {
      guid: TEXTURE,
      pathname: "Assets/Outfit/Textures/body_black.png\n00",
      asset: Option.some(PREVIEW),
      meta: Option.some("fileFormatVersion: 2"),
      preview: Option.some(PREVIEW),
    },
    {
      guid: MATERIAL,
      pathname: "Assets/Outfit/Materials/body.mat",
      asset: Option.some(encoder.encode(`m_Texture: {fileID: 2800000, guid: ${TEXTURE}, type: 3}`)),
      meta: Option.none(),
      preview: Option.none(),
    },
  ]);
  return yield* readPackage(archive);
});

const entryOf =
  (guid: string) =>
  (entries: readonly PackageEntry[]): Option.Option<PackageEntry> =>
    pipe(
      entries,
      Array.findFirst((candidate) => candidate.guid === guid),
    );

layer(NodeServices.layer)("readPackage", (it) => {
  it.effect("reads the first line of pathname and the preview", () =>
    Effect.gen(function* test() {
      const entries = yield* fixture;
      const texture = entryOf(TEXTURE)(entries);
      expect(
        pipe(
          texture,
          Option.map(({ pathname }) => pathname),
        ),
      ).toStrictEqual(Option.some("Assets/Outfit/Textures/body_black.png"));
      expect(
        pipe(
          texture,
          Option.flatMap(({ preview }) => preview),
        ),
      ).toStrictEqual(Option.some(PREVIEW));
    }).pipe(Effect.scoped),
  );

  it.effect("collects the guids an asset refers to", () =>
    Effect.gen(function* test() {
      const entries = yield* fixture;
      const material = entryOf(MATERIAL)(entries);
      expect(
        pipe(
          material,
          Option.map(({ references }) => references),
        ),
      ).toStrictEqual(Option.some([TEXTURE]));
    }).pipe(Effect.scoped),
  );
});
