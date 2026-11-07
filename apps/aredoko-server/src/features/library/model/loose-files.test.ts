import { NodeServices } from "@effect/platform-node";
import { expect, layer } from "@effect/vitest";
import { Array, Effect, FileSystem, Order, Path, pipe } from "effect";

import { bundlesIn } from "./loose-files.ts";

const SOURCE_ID = 1;
const SWORD_BYTES = 3;
const COVER_BYTES = 4;

layer(NodeServices.layer, { excludeTestServices: true })("bundlesIn", (it) => {
  it.effect("groups loose assets by their top folder and keeps root files on their own", () =>
    Effect.gen(function* groups() {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = yield* fileSystem.makeTempDirectoryScoped();
      yield* fileSystem.makeDirectory(path.join(root, "Kit", "Models"), { recursive: true });
      yield* pipe(
        [
          ["Kit/Models/sword.fbx", "fbx"],
          ["Kit/cover.png", "png!"],
          ["crate.glb", "glb"],
          ["Cabin.unitypackage", "pkg"],
        ] as const,
        Effect.forEach(([name, text]) => fileSystem.writeFileString(path.join(root, name), text)),
      );
      const names = yield* fileSystem.readDirectory(root, { recursive: true });
      const bundles = yield* bundlesIn({ id: SOURCE_ID, path: root }, names);
      const shapes = pipe(
        bundles,
        Array.map(({ name, size, members }) => ({
          name,
          size,
          members: pipe(
            members,
            Array.map(({ pathname }) => pathname),
            Array.sortWith((pathname) => pathname, Order.String),
          ),
        })),
        Array.sortWith(({ name }) => name, Order.String),
      );
      expect(shapes).toStrictEqual([
        {
          name: "Kit",
          size: SWORD_BYTES + COVER_BYTES,
          members: ["Kit/Models/sword.fbx", "Kit/cover.png"],
        },
        { name: "crate", size: SWORD_BYTES, members: ["crate.glb"] },
      ]);
    }).pipe(Effect.scoped),
  );
});
