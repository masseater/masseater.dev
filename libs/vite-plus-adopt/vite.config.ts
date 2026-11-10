import { Array as Arr, Effect, Function, Option, Record as Rec } from "effect";
import { defineConfig } from "vite-plus";

import type {
  CheckPackageOptions,
  CheckResult,
  checkPackage,
  createPackageFromTarballData,
} from "#src/attw.ts";

const BANNERS: Readonly<Record<string, string>> = { cli: "#!/usr/bin/env node" };

const local = (path: string): string => new URL(path, import.meta.url).pathname;

const ATTW_LIB = local("upstream/attw-core/lib/");
const ATTW_TESTS = local("upstream/attw-core/test/");
const VIRTUAL_HOSTS = "\0attw-compiler-hosts";
const NODE_TEST_SHIM = "attw-node-test";
const VIRTUAL_NODE_TEST = `\0${NODE_TEST_SHIM}`;

const ATTW_ROOTS: readonly string[] = [ATTW_LIB, ATTW_TESTS];

const isAttwUpstream = (importer: string | undefined): boolean =>
  Option.fromNullishOr(importer).pipe(
    Option.exists((path) => ATTW_ROOTS.some((root) => path.startsWith(root))),
  );

const ATTW_REDIRECTS: readonly (readonly [(id: string) => boolean, string])[] = [
  [(id) => id.endsWith("/multiCompilerHost.js"), VIRTUAL_HOSTS],
  [(id) => id === "typescript", local("src/attw/typescript.ts")],
];

const attwRedirect = (id: string, importer: string | undefined): Option.Option<string> =>
  Arr.findFirst(ATTW_REDIRECTS, ([matches]) => matches(id)).pipe(
    Option.filter(() => isAttwUpstream(importer)),
    Option.map(([, target]) => target),
  );

const redirect = (id: string, importer: string | undefined): Option.Option<string> =>
  Option.liftPredicate(VIRTUAL_NODE_TEST, () => id === NODE_TEST_SHIM).pipe(
    Option.orElse(() => attwRedirect(id, importer)),
  );

const VIRTUAL_MODULES: Readonly<Record<string, string>> = {
  [VIRTUAL_HOSTS]: [
    `import minimalLibDts from ${JSON.stringify(`${ATTW_LIB}internal/minimalLibDts.js`)};`,
    `import { createCompilerHostWrapperWith, createCompilerHostsWith } from ${JSON.stringify(local("src/attw/compiler-hosts.ts"))};`,
    "export const createCompilerHosts = (fs) => createCompilerHostsWith(fs, minimalLibDts);",
    "export function CompilerHostWrapper(fs, moduleResolution) {",
    "  return createCompilerHostWrapperWith(fs, moduleResolution, minimalLibDts);",
    "}",
  ].join("\n"),
  [VIRTUAL_NODE_TEST]:
    'export { afterAll as after, describe, test, test as default } from "vite-plus/test";',
};

const attwUpstream = {
  name: "attw-upstream-redirects",
  enforce: "pre",
  resolveId: {
    order: "pre",
    handler: (id: string, importer: string | undefined): string | undefined =>
      Option.getOrUndefined(redirect(id, importer)),
  },
  load: (id: string): string | undefined => VIRTUAL_MODULES[id],
} as const;

const typescriptShim = {
  name: "typescript-shim",
  enforce: "pre",
  resolveId: {
    order: "pre",
    handler: (id: string): string | undefined =>
      Option.liftPredicate(id, (candidate) => candidate === "typescript").pipe(
        Option.map(() => local("src/fsd-typescript.ts")),
        Option.getOrUndefined,
      ),
  },
} as const;

interface BuiltAttw {
  readonly checkPackage: typeof checkPackage;
  readonly createPackageFromTarballData: typeof createPackageFromTarballData;
}

const loadBuiltAttw = (): Promise<BuiltAttw> =>
  import(new URL("dist/attw.mjs", import.meta.url).href);

const checkWith =
  (tarball: Uint8Array, options: CheckPackageOptions) =>
  (attw: BuiltAttw): Effect.Effect<CheckResult> =>
    Effect.promise(() => attw.checkPackage(attw.createPackageFromTarballData(tarball), options));

const builtAttw = {
  createPackageFromTarballData: Function.identity,
  checkPackage: (tarball: Uint8Array, options: CheckPackageOptions): Promise<CheckResult> =>
    Effect.promise(loadBuiltAttw).pipe(
      Effect.flatMap(checkWith(tarball, options)),
      Effect.runPromise,
    ),
};

export default defineConfig({
  tsconfig: "tsconfig.json",
  plugins: [attwUpstream, typescriptShim],
  pack: {
    entry: ["src/index.ts", "src/cli.ts", "src/postinstall.ts", "src/fsd.ts", "src/attw.ts"],
    platform: "node",
    plugins: [attwUpstream, typescriptShim],
    deps: {
      alwaysBundle: [/^@feature-sliced\//u],
    },
    copy: [
      {
        from: local("node_modules/@feature-sliced/steiger-plugin/dist/parsers"),
        to: local("dist"),
      },
    ],
    sourcemap: true,
    dts: { generator: "tsgo" },
    publint: { strict: true },
    attw: { module: builtAttw, profile: "esm-only", level: "error" },
    outputOptions: {
      banner: (chunk) => Option.getOrElse(Rec.get(BANNERS, chunk.name), () => ""),
    },
  },
  resolve: {
    dedupe: ["vitest"],
    alias: [
      { find: /^\.\.\/index\.js$/u, replacement: "@feature-sliced/filesystem" },
      { find: /^@arethetypeswrong\/core$/u, replacement: local("src/attw.ts") },
      { find: /^@arethetypeswrong\/core\/utils$/u, replacement: `${ATTW_LIB}utils.js` },
      { find: /^#internal\/(?<path>.*)$/u, replacement: `${ATTW_LIB}internal/$<path>` },
      { find: /^node:test$/u, replacement: NODE_TEST_SHIM },
      { find: /^vitest$/u, replacement: "vite-plus/test" },
    ],
  },
  test: {
    testTimeout: 600_000,
    hookTimeout: 600_000,
    include: [
      "src/**/*.test.ts",
      "tests/**/*.test.ts",
      "upstream/filesystem/specs/*.spec.ts",
      "upstream/attw-core/test/**/*.test.ts",
    ],
    server: {
      deps: {
        inline: ["@effect/vitest", /@feature-sliced\//u],
      },
    },
  },
  run: {
    tasks: {
      build: { command: "vp pack", cache: false },
      test: { command: "vp test run", dependsOn: ["build"] },
      size: { command: "size-limit", dependsOn: ["build"], cache: false },
    },
  },
});
