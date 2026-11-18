import { Effect, FileSystem, Path } from "effect";

const HOOK_FILE = "widen-ranges.mjs";

/** @internal */
export const WIDEN_RANGES = `const EXACT = /^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$/u;
const widen = (held) =>
  held === undefined
    ? undefined
    : Object.fromEntries(Object.entries(held).map(([name, specifier]) => [name, EXACT.test(specifier) ? \`^\${specifier}\` : specifier]));
export const hooks = {
  beforePacking: (manifest) => ({
    ...manifest,
    dependencies: widen(manifest.dependencies),
    peerDependencies: widen(manifest.peerDependencies),
  }),
};
`;

/** @internal */
export const widenRangesEnv = Effect.fn("publish.widenRanges")(function* widenRangesEnv(
  directory: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const hook = path.join(directory, HOOK_FILE);
  yield* fileSystem.writeFileString(hook, WIDEN_RANGES);
  return { pnpm_config_pnpmfile: hook };
});
