import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { Array as Arr, Effect, FileSystem, ManagedRuntime, Path } from "effect";
import type { Scope } from "effect";
import type { PlatformError } from "effect/PlatformError";
import { afterAll, expect, test } from "vite-plus/test";

import { lint } from "./index.ts";
import type { Diagnostic, Y8Config, Y8Error } from "./index.ts";

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

const DOCUMENT = "# Title\n\n## Section\n\nSome text here.   \n";

const CACHE = "node_modules/.cache/y8";

const lintIn =
  (root: string) =>
  (config: Y8Config): Effect.Effect<readonly Diagnostic[], Y8Error> =>
    lint({ root, files: ["doc.md"], config });

const projectWithDocument: Effect.Effect<
  string,
  PlatformError,
  FileSystem.FileSystem | Path.Path | Scope.Scope
> = Effect.gen(function* project() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* fileSystem.makeTempDirectoryScoped();
  yield* fileSystem.writeFileString(path.join(root, "doc.md"), DOCUMENT);
  return root;
});

test("a cached run reports what the first run reported, and a config change misses the cache", () =>
  Effect.gen(function* cached() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = yield* projectWithDocument;
    const first = yield* lintIn(root)({});
    const stored = yield* fileSystem.readDirectory(path.join(root, CACHE));
    const again = yield* Effect.all(
      [
        lintIn(root)({}),
        lintIn(root)({ cache: false }),
        lintIn(root)({ rules: { "markdownlint/MD009": "off" } }),
      ],
      { concurrency: 1 },
    );
    expect(Arr.isReadonlyArrayNonEmpty(stored)).toBe(true);
    expect(again).toStrictEqual([first, first, []]);
  }).pipe(Effect.scoped, services.runPromise));
