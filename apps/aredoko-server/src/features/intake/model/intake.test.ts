import { NodeServices } from "@effect/platform-node";
import { expect, layer } from "@effect/vitest";
import { TextReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import { Array, Effect, FileSystem, Option, Order, Path, Record, pipe } from "effect";

import { Settings } from "#shared/settings";

import { IntakeFailed } from "./intake-failed.ts";
import { intake } from "./intake.ts";
import { libraryFolder } from "./library-folder.ts";

const ZIPPED = "衣装/Dress.unitypackage";
const BOTH = 2;
const THREE = 3;
const NONE = 0;

const withSettings = Effect.fn("withSettings")(function* withSettings<Value, Failure, Requirements>(
  run: (folder: string) => Effect.Effect<Value, Failure, Requirements>,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const dataDirectory = yield* fileSystem.makeTempDirectoryScoped();
  const settings = {
    dataDirectory,
    modelDirectory: Option.none<string>(),
    embedderWorker: new URL("file:///unused"),
  };
  const library = yield* libraryFolder.pipe(Effect.provideService(Settings, settings));
  return yield* run(library).pipe(Effect.provideService(Settings, settings));
});

const listed = Effect.fn("listed")(function* listed(folder: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const names = yield* fileSystem.readDirectory(folder, { recursive: true });
  return pipe(
    names,
    Array.sortWith((name: string) => name, Order.String),
  );
});

const writeTree = Effect.fn("writeTree")(function* writeTree(
  root: string,
  files: Readonly<Record<string, string>>,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* pipe(
    Record.toEntries(files),
    Effect.forEach(([name, text]) => {
      const file = path.join(root, name);
      return fileSystem
        .makeDirectory(path.dirname(file), { recursive: true })
        .pipe(Effect.andThen(fileSystem.writeFileString(file, text)));
    }),
  );
});

const makeZip = Effect.gen(function* makeZip() {
  const writer = new ZipWriter(new Uint8ArrayWriter());
  yield* Effect.promise(() => writer.add(ZIPPED, new TextReader("dress")));
  yield* Effect.promise(() => writer.add("readme.txt", new TextReader("ignored")));
  yield* Effect.promise(() => writer.add("Textures/dress.png", new TextReader("png")));
  return yield* Effect.promise(() => writer.close());
});

layer(NodeServices.layer, { excludeTestServices: true })("intake", (it) => {
  it.effect("copies dropped packages and the packages inside a zip into the library", () =>
    Effect.gen(function* copiesDropped() {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const downloads = yield* fileSystem.makeTempDirectoryScoped();
      const cabin = path.join(downloads, "Cabin.unitypackage");
      const zip = path.join(downloads, "Dress.zip");
      yield* fileSystem.writeFileString(cabin, "cabin");
      const zipBytes = yield* makeZip;
      yield* fileSystem.writeFile(zip, zipBytes);
      yield* withSettings((library) =>
        Effect.gen(function* inLibrary() {
          const placed = yield* intake([cabin, zip]);
          expect(placed).toBe(THREE);
          const names = yield* listed(library);
          expect(names).toStrictEqual([
            "Cabin.unitypackage",
            "Dress",
            path.join("Dress", "Dress.unitypackage"),
            path.join("Dress", "Textures"),
            path.join("Dress", "Textures", "dress.png"),
          ]);
          const again = yield* intake([downloads]);
          expect(again).toBe(NONE);
        }),
      );
    }),
  );

  it.effect("keeps both when a different package has the same name", () =>
    Effect.gen(function* keepsBoth() {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const first = yield* fileSystem.makeTempDirectoryScoped();
      const second = yield* fileSystem.makeTempDirectoryScoped();
      yield* fileSystem.writeFileString(path.join(first, "Cabin.unitypackage"), "v1");
      yield* fileSystem.writeFileString(path.join(second, "Cabin.unitypackage"), "version 2");
      yield* withSettings((library) =>
        Effect.gen(function* inLibrary() {
          const placed = yield* intake([first, second]);
          expect(placed).toBe(BOTH);
          const names = yield* listed(library);
          expect(names).toStrictEqual(["Cabin (2).unitypackage", "Cabin.unitypackage"]);
        }),
      );
    }),
  );
});

layer(NodeServices.layer, { excludeTestServices: true })(
  "intake of a package with a taken name and size",
  (it) => {
    it.effect("名前と大きさが同じでも中身の違うパッケージは両方残す", () =>
      Effect.gen(function* keepsSameSize() {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const first = yield* fileSystem.makeTempDirectoryScoped();
        const second = yield* fileSystem.makeTempDirectoryScoped();
        yield* fileSystem.writeFileString(path.join(first, "Cabin.unitypackage"), "v1");
        yield* fileSystem.writeFileString(path.join(second, "Cabin.unitypackage"), "v2");
        yield* withSettings((library) =>
          Effect.gen(function* inLibrary() {
            const placed = yield* intake([first, second]);
            expect(placed).toBe(BOTH);
            const names = yield* listed(library);
            expect(names).toStrictEqual(["Cabin (2).unitypackage", "Cabin.unitypackage"]);
            const again = yield* intake([second, first]);
            expect(again).toBe(NONE);
          }),
        );
      }),
    );
  },
);

layer(NodeServices.layer, { excludeTestServices: true })(
  "intake of a zip with a taken name and size",
  (it) => {
    it.effect("zip の中のパッケージも、名前と大きさが同じで中身の違うものは両方残す", () =>
      Effect.gen(function* keepsSameSizeFromZip() {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const downloads = yield* fileSystem.makeTempDirectoryScoped();
        const zip = path.join(downloads, "Dress.zip");
        const zipBytes = yield* makeZip;
        yield* fileSystem.writeFile(zip, zipBytes);
        yield* withSettings((library) =>
          Effect.gen(function* inLibrary() {
            yield* writeTree(library, { "Dress/Dress.unitypackage": "DRESS" });
            const placed = yield* intake([zip]);
            expect(placed).toBe(BOTH);
            const names = yield* listed(path.join(library, "Dress"));
            expect(names).toStrictEqual([
              "Dress (2).unitypackage",
              "Dress.unitypackage",
              "Textures",
              path.join("Textures", "dress.png"),
            ]);
            const again = yield* intake([zip]);
            expect(again).toBe(NONE);
          }),
        );
      }),
    );
  },
);

const ESCAPING = ["../outside.txt", "a/../../outside2.txt", "ok/inside.png"] as const;

const makeEscapingZip = Effect.gen(function* makeEscapingZip() {
  const writer = new ZipWriter(new Uint8ArrayWriter());
  yield* pipe(
    ESCAPING,
    Effect.forEach((name) => Effect.promise(() => writer.add(name, new TextReader("png")))),
  );
  return yield* Effect.promise(() => writer.close());
});

layer(NodeServices.layer, { excludeTestServices: true })("intake of an escaping zip", (it) => {
  it.effect("展開先の外を指す項目を持つ zip は取り込みに失敗し、何も書かない", () =>
    Effect.gen(function* rejectsEscaping() {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const downloads = yield* fileSystem.makeTempDirectoryScoped();
      const zip = path.join(downloads, "Bundle.zip");
      const zipBytes = yield* makeEscapingZip;
      yield* fileSystem.writeFile(zip, zipBytes);
      yield* withSettings((library) =>
        Effect.gen(function* inLibrary() {
          const failure = yield* Effect.flip(intake([zip]));
          expect(failure).toBeInstanceOf(IntakeFailed);
          const written = yield* listed(path.dirname(library));
          expect(written).toStrictEqual([]);
          const kept = yield* listed(downloads);
          expect(kept).toStrictEqual(["Bundle.zip"]);
        }),
      );
    }),
  );
});

layer(NodeServices.layer, { excludeTestServices: true })("intake of loose files", (it) => {
  it.effect("copies loose models with their materials and keeps the folder layout", () =>
    Effect.gen(function* copiesLoose() {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const downloads = yield* fileSystem.makeTempDirectoryScoped();
      yield* writeTree(downloads, {
        "crate.obj": "mtllib crate.mtl",
        "crate.mtl": "map_Kd wood.png",
        "notes.txt": "ignored",
        "Kit/Models/sword.fbx": "fbx",
        "Kit/cover.png": "png",
      });
      const crate = path.join(downloads, "crate.obj");
      const kit = path.join(downloads, "Kit");
      yield* withSettings((library) =>
        Effect.gen(function* inLibrary() {
          const placed = yield* intake([crate, kit]);
          expect(placed).toBe(BOTH);
          const names = yield* listed(library);
          expect(names).toStrictEqual([
            "Kit",
            path.join("Kit", "Models"),
            path.join("Kit", "Models", "sword.fbx"),
            path.join("Kit", "cover.png"),
            "crate",
            path.join("crate", "crate.mtl"),
            path.join("crate", "crate.obj"),
          ]);
        }),
      );
    }),
  );
});
