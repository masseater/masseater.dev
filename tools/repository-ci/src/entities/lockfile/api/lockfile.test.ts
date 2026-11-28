import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import type { LockfileObject } from "@pnpm/lockfile.types";
import { Effect, FileSystem, Path } from "effect";
import type { PlatformError, Scope } from "effect";
import { expect, it } from "vite-plus/test";

import { sameResolution } from "#/entities/lockfile/model/lockfile.ts";

import { lockfileIn } from "./lockfile.ts";
import type { LockfileError } from "./lockfile.ts";

type Parts = Readonly<{ deep?: string; leaf?: string; overrides?: string }>;

const lockText = ({
  deep = "1.0.0",
  leaf = "1.0.0",
  overrides = " {}",
}: Parts): string => `lockfileVersion: '9.0'
settings:
  autoInstallPeers: true
overrides:${overrides}
importers:
  apps/a:
    dependencies:
      left:
        specifier: 1.0.0
        version: 1.0.0
  apps/b:
    dependencies:
      right:
        specifier: 2.0.0
        version: 2.0.0
packages:
  left@1.0.0:
    resolution: {integrity: sha512-aaaa}
  right@2.0.0:
    resolution: {integrity: sha512-aaaa}
  deep@${deep}:
    resolution: {integrity: sha512-aaaa}
  leaf@${leaf}:
    resolution: {integrity: sha512-aaaa}
snapshots:
  left@1.0.0:
    dependencies:
      deep: ${deep}
  right@2.0.0:
    dependencies:
      leaf: ${leaf}
  deep@${deep}: {}
  leaf@${leaf}: {}
`;

const read = (
  text: string,
): Effect.Effect<
  LockfileObject,
  LockfileError | PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path | Scope.Scope
> =>
  Effect.gen(function* reading() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const directory = yield* fs.makeTempDirectoryScoped();
    yield* fs.writeFileString(path.join(directory, "pnpm-lock.yaml"), text);
    return yield* lockfileIn(directory);
  });

const same = (
  before: string,
  after: string,
  directory: string,
): Effect.Effect<
  boolean,
  LockfileError | PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path | Scope.Scope
> =>
  Effect.gen(function* comparing() {
    const x = yield* read(before);
    const y = yield* read(after);
    return sameResolution({ before: x, after: y, directories: [directory] });
  });

const run = (
  effect: Effect.Effect<
    void,
    LockfileError | PlatformError.PlatformError,
    FileSystem.FileSystem | Path.Path | Scope.Scope
  >,
): Promise<void> => Effect.runPromise(effect.pipe(Effect.scoped, Effect.provide(nodeServices)));

const BASE = lockText({});

it("a bump that only another importer reaches leaves this importer unchanged", () =>
  run(
    Effect.gen(function* checking() {
      const bumped = lockText({ leaf: "2.0.0" });
      const aSame = yield* same(BASE, bumped, "apps/a");
      expect(aSame).toBe(true);
      const bSame = yield* same(BASE, bumped, "apps/b");
      expect(bSame).toBe(false);
    }),
  ));

it("a bump of a transitive dependency changes the importers that reach it", () =>
  run(
    Effect.gen(function* checking() {
      const bumped = lockText({ deep: "1.0.1" });
      const aSame = yield* same(BASE, bumped, "apps/a");
      expect(aSame).toBe(false);
      const bSame = yield* same(BASE, bumped, "apps/b");
      expect(bSame).toBe(true);
    }),
  ));

it("an importer missing from both lockfiles counts as unchanged", () =>
  run(
    Effect.gen(function* checking() {
      const noneSame = yield* same(BASE, BASE, "apps/none");
      expect(noneSame).toBe(true);
    }),
  ));

it("a change in the overrides changes every importer", () =>
  run(
    Effect.gen(function* checking() {
      const overridden = lockText({ overrides: "\n  left: 2.0.0" });
      const aSame = yield* same(BASE, overridden, "apps/a");
      expect(aSame).toBe(false);
    }),
  ));
