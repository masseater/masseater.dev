import { mustSucceed } from "@masseater.dev/github-workflow";
import { Boolean as Bool, Effect, FileSystem, Path, String as Str } from "effect";

import { buildOf } from "#/shared/lib/host.ts";
import type { Host } from "#/shared/lib/host.ts";
import type { UpstreamPins } from "#/shared/lib/manifest.ts";
import { patchesOf } from "#/shared/lib/patches.ts";
import type { Patch } from "#/shared/lib/patches.ts";

const EFFECT_REPOSITORY = "https://github.com/Effect-TS/tsgo.git";
const TSRS_REPOSITORY = "https://github.com/oxc-project/tsrs.git";
const EFFECT_PATCHES = "_patches/tsrs";
const OUR_PATCHES = "patches";
const TOOLCHAIN = "rust-toolchain.toml";
const TAG_PREFIX = "v";
const TSRS = "tsrs";
const FEATURES = "cli,tsrs_cli/noembed";

interface Checkout {
  readonly directory: string;
  readonly work: string;
  readonly effect: string;
  readonly tsrs: string;
}

const clone = (repository: string, tag: string, into: string): ReturnType<typeof mustSucceed> =>
  mustSucceed({
    command: "git",
    args: ["clone", "--quiet", "--depth", "1", "--branch", tag, repository, into],
  });

const checkOut = Effect.fn("checkOut")(function* checkOut(
  checkout: Checkout,
  upstream: UpstreamPins,
) {
  yield* clone(EFFECT_REPOSITORY, upstream.effect, checkout.effect);
  yield* clone(TSRS_REPOSITORY, upstream.tsrs, checkout.tsrs);
});

const patchFile =
  (checkout: Checkout, path: Path.Path) =>
  ({ name, ours }: Patch): string =>
    Bool.match(ours, {
      onFalse: () => path.join(checkout.effect, EFFECT_PATCHES, name),
      onTrue: () => path.join(checkout.directory, OUR_PATCHES, name),
    });

const applyPatches = Effect.fn("applyPatches")(function* applyPatches(
  checkout: Checkout,
  upstream: UpstreamPins,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const ours = yield* fileSystem.readDirectory(path.join(checkout.directory, OUR_PATCHES));
  const theirs = yield* fileSystem.readDirectory(path.join(checkout.effect, EFFECT_PATCHES));
  const patches = patchesOf({ theirs, ours, skip: upstream.skip });
  yield* Effect.forEach(
    patches,
    (patch) =>
      mustSucceed({
        command: "git",
        args: ["apply", patchFile(checkout, path)(patch)],
        cwd: checkout.tsrs,
      }),
    { concurrency: 1, discard: true },
  );
});

const compile = Effect.fn("compile")(function* compile(checkout: Checkout) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* fileSystem.copyFile(
    path.join(checkout.tsrs, TOOLCHAIN),
    path.join(checkout.effect, TOOLCHAIN),
  );
  const cargoTarget = path.join(checkout.work, "cargo");
  yield* mustSucceed({
    command: "cargo",
    args: ["build", "--release", "-p", "ets_tsrs", "--features", FEATURES],
    cwd: checkout.effect,
    env: { CARGO_TARGET_DIR: cargoTarget },
  });
  return path.join(cargoTarget, "release");
});

const baseOf = Effect.fn("baseOf")(function* baseOf(work: string, target: string, tag: string) {
  const path = yield* Path.Path;
  const version = Str.replace(TAG_PREFIX, "")(tag);
  yield* mustSucceed({
    command: "npm",
    args: ["pack", "--silent", `@tsrs/${target}@${version}`, "--pack-destination", work],
  });
  const tarball = path.join(work, `tsrs-${target}-${version}.tgz`);
  yield* mustSucceed({ command: "tar", args: ["-xzf", tarball, "-C", work] });
  return path.join(work, "package");
});

interface Packed {
  readonly built: string;
  readonly contents: string;
  readonly output: string;
  readonly executable: string;
}

const place = Effect.fn("place")(function* place({ built, contents, output, executable }: Packed) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* fileSystem.remove(path.join(contents, "package.json"));
  yield* fileSystem.copyFile(path.join(built, executable), path.join(contents, executable));
  yield* fileSystem.remove(output, { recursive: true, force: true });
  yield* fileSystem.copy(contents, output);
});

const checkoutFor = Effect.fn("checkoutFor")(function* checkoutFor(directory: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const work = yield* fileSystem.makeTempDirectoryScoped({ prefix: "tsrs-effect-" });
  const effect = path.join(work, "tsgo");
  return { directory, work, effect, tsrs: path.join(effect, TSRS) } satisfies Checkout;
});

/** @internal */
export const buildTsrs = Effect.fn("buildTsrs")(function* buildTsrs(host: Host) {
  const { upstream, target, output, executable } = yield* buildOf(host);
  const checkout = yield* checkoutFor(host.directory);
  yield* checkOut(checkout, upstream);
  yield* applyPatches(checkout, upstream);
  const built = yield* compile(checkout);
  const contents = yield* baseOf(checkout.work, target, upstream.tsrs);
  yield* place({ built, contents, output, executable });
}, Effect.scoped);
