import type { CheckPackageOptions, CheckResult } from "@r_masseater/vite-plus-adopt/attw";
import {
  Effect,
  Function,
  Option,
  Record,
  Array as Arr,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";
import { defineConfig } from "vite-plus";

import { toJson } from "./src/json.ts";
import { upstreamRemotionRules } from "./upstream/remotion-modules.ts";

const local = (path: string): string => new URL(path, import.meta.url).pathname;

const checkWithVpTools = (
  tarball: Uint8Array,
  options: CheckPackageOptions,
): Effect.Effect<CheckResult> =>
  Effect.promise(() => import("@r_masseater/vite-plus-adopt/attw")).pipe(
    Effect.flatMap((attw) =>
      Effect.promise(() => attw.checkPackage(attw.createPackageFromTarballData(tarball), options)),
    ),
  );

const attwModule = {
  createPackageFromTarballData: Function.identity,
  checkPackage: (tarball: Uint8Array, options: CheckPackageOptions): Promise<CheckResult> =>
    Effect.runPromise(checkWithVpTools(tarball, options)),
};

const shims: Readonly<Record<string, string>> = {
  typescript: local("src/ts-compat.ts"),
  "ts-api-utils": local("src/ts-api-utils.ts"),
  "@typescript-eslint/utils": local("src/typescript-eslint-utils.ts"),
  "@typescript-eslint/typescript-estree": local(
    "node_modules/@typescript-eslint/typescript-estree/dist/simple-traverse.js",
  ),
};

const shimAliases = pipe(
  Rec.toEntries(shims),
  Arr.map(([name, replacement]) => ({
    find: new RegExp(`^${name}$`, "u"),
    replacement,
  })),
);

const UPSTREAM_REACT_SPEC =
  /\/upstream\/react\/plugins\/eslint-plugin-react-(?<plugin>[a-z-]+)\/src\/rules\/(?<rule>[^/]+)\/[^/]+\.spec\.ts$/u;

const VIRTUAL_RULE = "\0upstream-react-rule:";

const ruleParts = ({
  plugin,
  rule,
}: Readonly<Record<string, string | undefined>>): Option.Option<{
  readonly plugin: string;
  readonly rule: string;
}> => Option.all({ plugin: Option.fromNullishOr(plugin), rule: Option.fromNullishOr(rule) });

const upstreamRuleOf = (id: string, importer: string): Option.Option<string> =>
  Option.fromNullishOr(UPSTREAM_REACT_SPEC.exec(importer)).pipe(
    Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
    Option.flatMap(ruleParts),
    Option.filter(({ rule }) => id === `./${rule}`),
    Option.map(({ plugin, rule }) => `${VIRTUAL_RULE}${plugin}/${rule}`),
  );

const virtualRuleOf = (
  prefix: string,
  id: string,
): Option.Option<{ readonly plugin: string; readonly rule: string }> =>
  Option.liftPredicate(id, (candidate) => Str.startsWith(prefix)(candidate)).pipe(
    Option.map((virtual) => Str.split(Str.slice(prefix.length)(virtual), "/")),
    Option.flatMap(([plugin, rule]) => ruleParts({ plugin, rule })),
  );

const upstreamRuleModule = (id: string): Option.Option<string> =>
  virtualRuleOf(VIRTUAL_RULE, id).pipe(
    Option.map(({ plugin, rule }) =>
      pipe(
        [
          `import plugin from ${toJson(local("src/react.ts"))};`,
          `export const RULE_NAME = ${toJson(rule)};`,
          `export default plugin.rules[${toJson(`${plugin}-${rule}`)}];`,
        ],
        Arr.join("\n"),
      ),
    ),
  );

const upstreamReactRules = {
  name: "upstream-react-rules",
  enforce: "pre",
  resolveId: (id: string, importer: string | undefined): string | undefined =>
    Option.fromNullishOr(importer).pipe(
      Option.flatMap((spec) => upstreamRuleOf(id, spec)),
      Option.getOrUndefined,
    ),
  load: (id: string): string | undefined => Option.getOrUndefined(upstreamRuleModule(id)),
} as const;

const UPSTREAM_TANSTACK_TEST =
  /\/upstream\/tanstack-(?<plugin>query|router)\/src\/__tests__\/[^/]+\.ts$/u;

const UPSTREAM_TANSTACK_RULE = /^\.\.\/rules\/(?<rule>[^/]+)\/\k<rule>\.rule$/u;

const VIRTUAL_TANSTACK_RULE = "\0upstream-tanstack-rule:";

const VIRTUAL_PARSER = "\0upstream-typescript-eslint-parser";

const upstreamSource = (plugin: string, path: string): string =>
  local(`node_modules/@tanstack/eslint-plugin-${plugin}/src/${path}.ts`);

const groupOf = (pattern: Readonly<RegExp>, name: string, text: string): Option.Option<string> =>
  Option.fromNullishOr(pattern.exec(text)).pipe(
    Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
    Option.flatMap((groups) => Record.get(groups, name)),
  );

const tanstackPluginOf = (importer: string): Option.Option<string> =>
  groupOf(UPSTREAM_TANSTACK_TEST, "plugin", importer);

const tanstackRuleOf = (id: string): Option.Option<string> =>
  groupOf(UPSTREAM_TANSTACK_RULE, "rule", id);

const tanstackModuleOf = (plugin: string, id: string): Option.Option<string> =>
  Option.liftPredicate(id, (candidate) => Str.startsWith("../")(candidate)).pipe(
    Option.map((relative) =>
      tanstackRuleOf(relative).pipe(
        Option.match({
          onSome: (rule) => `${VIRTUAL_TANSTACK_RULE}${plugin}/${rule}`,
          onNone: () => upstreamSource(plugin, Str.slice("../".length)(relative)),
        }),
      ),
    ),
    Option.orElse(() =>
      Option.liftPredicate(VIRTUAL_PARSER, () => id === "@typescript-eslint/parser"),
    ),
  );

const tanstackRuleModule = (id: string): Option.Option<string> =>
  virtualRuleOf(VIRTUAL_TANSTACK_RULE, id).pipe(
    Option.map(({ plugin, rule }) =>
      pipe(
        [
          `import plugin from ${toJson(local(`src/tanstack-${plugin}.ts`))};`,
          `export * from ${toJson(upstreamSource(plugin, `rules/${rule}/${rule}.rule`))};`,
          `export const name = ${toJson(rule)};`,
          `export const rule = plugin.rules[${toJson(rule)}];`,
        ],
        Arr.join("\n"),
      ),
    ),
    Option.orElse(() =>
      Option.liftPredicate('export const meta = { name: "oxc" };', () => id === VIRTUAL_PARSER),
    ),
  );

const upstreamTanstackModules = {
  name: "upstream-tanstack-modules",
  enforce: "pre",
  resolveId: (id: string, importer: string | undefined): string | undefined =>
    Option.fromNullishOr(importer).pipe(
      Option.flatMap(tanstackPluginOf),
      Option.flatMap((plugin) => tanstackModuleOf(plugin, id)),
      Option.getOrUndefined,
    ),
  load: (id: string): string | undefined => Option.getOrUndefined(tanstackRuleModule(id)),
} as const;

const UPSTREAM_DRIZZLE_TEST = /\/upstream\/drizzle\/tests\/[^/]+\.ts$/u;

const UPSTREAM_DRIZZLE_RULE = /^\.\.\/src\/(?<rule>[a-z-]+)$/u;

const VIRTUAL_DRIZZLE_RULE = "\0upstream-drizzle-rule:";

const drizzleRuleOf = (id: string, importer: string): Option.Option<string> =>
  Option.liftPredicate(importer, (candidate) => UPSTREAM_DRIZZLE_TEST.test(candidate)).pipe(
    Option.flatMap(() => groupOf(UPSTREAM_DRIZZLE_RULE, "rule", id)),
    Option.map((rule) => `${VIRTUAL_DRIZZLE_RULE}${rule}`),
  );

const drizzleRuleModule = (id: string): Option.Option<string> =>
  Option.liftPredicate(id, (candidate) => Str.startsWith(VIRTUAL_DRIZZLE_RULE)(candidate)).pipe(
    Option.map((virtual) =>
      pipe(
        [
          `import plugin from ${toJson(local("src/drizzle.ts"))};`,
          `export default plugin.rules[${toJson(Str.slice(VIRTUAL_DRIZZLE_RULE.length)(virtual))}];`,
        ],
        Arr.join("\n"),
      ),
    ),
  );

const upstreamDrizzleRules = {
  name: "upstream-drizzle-rules",
  enforce: "pre",
  resolveId: (id: string, importer: string | undefined): string | undefined =>
    Option.fromNullishOr(importer).pipe(
      Option.flatMap((spec) => drizzleRuleOf(id, spec)),
      Option.getOrUndefined,
    ),
  load: (id: string): string | undefined => Option.getOrUndefined(drizzleRuleModule(id)),
} as const;

export default defineConfig({
  plugins: [
    upstreamReactRules,
    upstreamTanstackModules,
    upstreamDrizzleRules,
    upstreamRemotionRules,
  ],
  run: {
    tasks: {
      build: {
        command: "vp pack",
        dependsOn: ["@r_masseater/vite-plus-adopt#build"],
        cache: false,
      },
      test: { command: "vp test run", dependsOn: ["build"] },
      size: { command: "size-limit", dependsOn: ["build"], cache: false },
    },
  },
  pack: {
    entry: [
      "src/index.ts",
      "src/tanstack-start.ts",
      "src/tanstack-query.ts",
      "src/tanstack-router.ts",
      "src/drizzle.ts",
      "src/remotion.ts",
      "src/react.ts",
    ],
    platform: "node",
    sourcemap: true,
    alias: shims,
    deps: {
      alwaysBundle: [/^(?!effect(?:\/|$)|typescript\/)/u],
      neverBundle: [/^(?:effect(?:\/|$)|typescript\/)/u],
    },
    dts: { generator: "oxc" },
    publint: { strict: true },
    attw: { module: attwModule, profile: "esm-only", level: "error" },
  },
  resolve: {
    alias: [
      ...shimAliases,
      { find: "@typescript-eslint/rule-tester", replacement: local("upstream/rule-tester.ts") },
      { find: "@local/testkit", replacement: local("upstream/react-testkit.ts") },
      { find: "./create-rule-tester", replacement: local("upstream/remotion-testkit.ts") },
      {
        find: "../rules/no-async-client-component/no-async-client-component.rule",
        replacement: local("upstream/rules/no-async-client-component.ts"),
      },
      {
        find: "../rules/no-client-code-in-server-component/no-client-code-in-server-component.rule",
        replacement: local("upstream/rules/no-client-code-in-server-component.ts"),
      },
      { find: /^vitest$/u, replacement: "vite-plus/test" },
    ],
  },
  test: {
    globals: true,
    server: {
      deps: {
        inline: [
          /@tanstack\/eslint-plugin-/u,
          "eslint-plugin-drizzle",
          "@remotion/eslint-plugin",
          /@eslint-react\//u,
          /eslint-plugin-react-/u,
        ],
      },
    },
    include: [
      "src/**/*.test.ts",
      "upstream/src/__tests__/*.test.ts",
      "upstream/tanstack-query/src/__tests__/*.test.ts",
      "upstream/tanstack-router/src/__tests__/*.test.ts",
      "upstream/drizzle/tests/*.test.ts",
      "upstream/remotion/src/tests/*.test.ts",
      "upstream/react/plugins/**/*.spec.ts",
    ],
  },
});
