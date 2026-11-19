import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { FixtureFiles, directoryWith } from "#/shared/lib/repository.test.support.ts";

import { writeLockedClosures } from "./locked-closure-files.ts";

export const LOCK_FILE = "pnpm-lock.yaml";
export const APP_CLOSURE = "libs/app/node_modules/.cache/msch/locked-inputs.lock";
export const OTHER_CLOSURE = "libs/other/node_modules/.cache/msch/locked-inputs.lock";
export const ROOT_CLOSURE = "node_modules/.cache/msch/locked-inputs.lock";

export interface Versions {
  readonly leaf: string;
  readonly right: string;
}

export const BASE: Versions = { leaf: "1.0.0", right: "1.0.0" };

export const LEAF = "{leaf}";
export const RIGHT = "{right}";
export const CLOSURE_LINE = "\n";
export const MISSING = "missing";

export const LOCKFILE = `lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:

  .:
    devDependencies:
      '@fixture/tooling':
        specifier: workspace:*
        version: link:libs/tooling
      tool:
        specifier: 1.0.0
        version: 1.0.0

  libs/app:
    dependencies:
      '@fixture/shared':
        specifier: workspace:*
        version: link:../shared
      left:
        specifier: 1.0.0
        version: 1.0.0
    devDependencies:
      tester:
        specifier: 1.0.0
        version: 1.0.0

  libs/other:
    dependencies:
      right:
        specifier: {right}
        version: {right}

  libs/shared:
    dependencies:
      deep:
        specifier: 1.0.0
        version: 1.0.0
    devDependencies:
      builder:
        specifier: 1.0.0
        version: 1.0.0

  libs/tooling: {}

packages:

  builder@1.0.0:
    resolution: {integrity: sha512-builder}

  deep@1.0.0:
    resolution: {integrity: sha512-deep}

  leaf@{leaf}:
    resolution: {integrity: sha512-leaf}

  left@1.0.0:
    resolution: {integrity: sha512-left}

  right@{right}:
    resolution: {integrity: sha512-right}

  tester@1.0.0:
    resolution: {integrity: sha512-tester}

  tool@1.0.0:
    resolution: {integrity: sha512-tool}

snapshots:

  builder@1.0.0: {}

  deep@1.0.0: {}

  leaf@{leaf}: {}

  left@1.0.0:
    dependencies:
      leaf: {leaf}

  right@{right}: {}

  tester@1.0.0: {}

  tool@1.0.0: {}
`;

export const lockfileWith = ({ leaf, right }: Versions): string =>
  pipe(LOCKFILE, Str.replaceAll(LEAF, leaf), Str.replaceAll(RIGHT, right));

export const APP_MANIFEST = "libs/app/package.json";
export const SHARED_MANIFEST = "libs/shared/package.json";
export const TOOLING_MANIFEST = "libs/tooling/package.json";

export interface Manifest {
  readonly name: string;
  readonly version: string;
  readonly exports: string;
}

export const manifest = ({ name, version, exports }: Manifest): string =>
  `{\n  "name": "${name}",\n  "version": "${version}",\n  "exports": "${exports}"\n}\n`;

export const WORKSPACE = {
  [LOCK_FILE]: lockfileWith(BASE),
  [APP_MANIFEST]: manifest({ name: "@fixture/app", version: "1.0.0", exports: "./src/index.ts" }),
  [SHARED_MANIFEST]: manifest({
    name: "@fixture/shared",
    version: "1.0.0",
    exports: "./src/index.ts",
  }),
  [TOOLING_MANIFEST]: manifest({
    name: "@fixture/tooling",
    version: "1.0.0",
    exports: "./src/index.ts",
  }),
};

export const closureOf = (leaf: string): string =>
  Arr.join(["deep@1.0.0", `leaf@${leaf}`, "left@1.0.0", "tester@1.0.0"], CLOSURE_LINE);

export const packagesIn = (closure: string): string =>
  pipe(
    Str.split(closure, CLOSURE_LINE),
    Arr.filter((line) => !Str.startsWith("manifest:")(line)),
    Arr.join(CLOSURE_LINE),
  );

export const manifestsIn = (closure: string): readonly string[] =>
  pipe(
    Str.split(closure, CLOSURE_LINE),
    Arr.filter(Str.startsWith("manifest:")),
    Arr.map((line) => pipe(Str.split(line, " "), Arr.headNonEmpty)),
  );

export const closureIn = Effect.fn("closureIn")(function* closureIn(root: string, file: string) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(files.join(root, file));
  return Option.getOrElse(text, () => MISSING);
});

export const relock = Effect.fn("relock")(function* relock(root: string, versions: Versions) {
  const fixtures = yield* FixtureFiles;
  const files = yield* RepositoryFiles;
  yield* fixtures.writeFile(files.join(root, LOCK_FILE), lockfileWith(versions));
});

export const rewriteManifest = Effect.fn("rewriteManifest")(function* rewriteManifest(
  root: string,
  [file, text]: readonly [string, string],
) {
  const fixtures = yield* FixtureFiles;
  const files = yield* RepositoryFiles;
  yield* fixtures.writeFile(files.join(root, file), text);
  yield* writeLockedClosures(root);
});

export const closuresAround = Effect.fn("closuresAround")(function* closuresAround(
  change: readonly [string, string],
) {
  const root = yield* directoryWith(WORKSPACE);
  yield* writeLockedClosures(root);
  const before = yield* closureIn(root, APP_CLOSURE);
  yield* rewriteManifest(root, change);
  const after = yield* closureIn(root, APP_CLOSURE);
  return { before, after };
});
