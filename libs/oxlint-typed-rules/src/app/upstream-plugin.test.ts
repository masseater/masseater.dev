import { layer } from "@effect/vitest";
import { deepStrictEqual } from "@effect/vitest/utils";
import upstreamRemotion from "@remotion/eslint-plugin";
import { Array as Arr, Effect, Layer, Option, Record, String as Str, pipe } from "effect";

import drizzle from "./drizzle.ts";
import eslintReact from "./react.ts";
import remotion from "./remotion.ts";
import tanstackQuery from "./tanstack-query.ts";
import tanstackRouter from "./tanstack-router.ts";
import type { Config } from "./upstream-plugin.ts";

type Configs = Readonly<Record<string, Config>>;

const configuredRules = (configs: Configs, name: string): readonly string[] =>
  pipe(
    Record.get(configs, name),
    Option.flatMap(({ rules }) => Option.fromNullishOr(rules)),
    Option.map(Record.keys),
    Option.getOrElse((): readonly string[] => []),
  );

const missingRules = (
  pluginName: string,
  configs: Configs,
  ruleIds: readonly string[],
): readonly string[] =>
  pipe(
    Record.keys(configs),
    Arr.flatMap((name) => configuredRules(configs, name)),
    Arr.filter((key) => !Arr.contains(ruleIds, Str.replace(`${pluginName}/`, "")(key))),
  );

const namesConfiguredRulesAfterThePlugin = Effect.sync(() => {
  deepStrictEqual(
    Arr.contains(
      configuredRules(tanstackQuery.configs, "flat/recommended-strict"),
      "tanstack-query/prefer-query-options",
    ),
    true,
  );
  deepStrictEqual(
    Record.get(tanstackRouter.configs, "flat/recommended"),
    Option.some<Config>({
      rules: {
        "tanstack-router/create-route-property-order": "warn",
        "tanstack-router/route-param-names": "error",
      },
    }),
  );
});

const keepsDrizzleConfigs = Effect.sync(() => {
  deepStrictEqual(drizzle.configs.recommended, {
    rules: {
      "drizzle/enforce-delete-with-where": "error",
      "drizzle/enforce-update-with-where": "error",
    },
  });
});

const keepsRemotionRuleIdsAndConfigs = Effect.sync(() => {
  deepStrictEqual(
    [remotion.meta.name, remotion.configs.recommended.rules, Record.keys(remotion.rules)],
    ["@remotion", upstreamRemotion.configs.recommended.rules, Record.keys(upstreamRemotion.rules)],
  );
});

const indexesKnownConfigsWithoutUndefined = Effect.sync(() => {
  const reactRules: Readonly<Record<string, unknown>> | undefined =
    eslintReact.configs["strict-typescript"].rules;
  const queryRules: Config["rules"] = tanstackQuery.configs["flat/recommended"].rules;
  deepStrictEqual(
    [
      Option.isSome(Option.fromNullishOr(reactRules)),
      Option.isSome(Option.fromNullishOr(queryRules)),
    ],
    [true, true],
  );
});

const configuresOnlyExistingRules = Effect.sync(() => {
  deepStrictEqual(
    [
      ...missingRules(
        tanstackQuery.meta.name,
        tanstackQuery.configs,
        Record.keys(tanstackQuery.rules),
      ),
      ...missingRules(
        tanstackRouter.meta.name,
        tanstackRouter.configs,
        Record.keys(tanstackRouter.rules),
      ),
      ...missingRules(drizzle.meta.name, drizzle.configs, Record.keys(drizzle.rules)),
      ...missingRules(remotion.meta.name, remotion.configs, Record.keys(remotion.rules)),
    ],
    [],
  );
});

layer(Layer.empty)("upstream plugins", (it) => {
  it.effect(
    "names the configured rules after the plugin",
    () => namesConfiguredRulesAfterThePlugin,
  );
  it.effect("configures only rules the plugin has", () => configuresOnlyExistingRules);
  it.effect("keeps the drizzle configs", () => keepsDrizzleConfigs);
  it.effect("keeps the remotion rule ids and configs", () => keepsRemotionRuleIdsAndConfigs);
  it.effect(
    "indexes the known configs without undefined",
    () => indexesKnownConfigsWithoutUndefined,
  );
});
