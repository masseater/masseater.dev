import { Array as Arr, Option, Predicate, Record, Schema, String as Str, pipe } from "effect";
import type { CreateRule, Plugin } from "vite-plus/lint/plugins";

import { rulesOf } from "./config-rules.ts";

const Severities: Schema.Literals<readonly ["error", "warn", "off"]> = Schema.Literals([
  "error",
  "warn",
  "off",
]);

type Severity = typeof Severities.Type;

interface Config {
  readonly rules?: Readonly<Record<string, Severity>> | undefined;
}

type UpstreamPlugin<ConfigName extends string> = Plugin & {
  readonly meta: { readonly name: string };
  readonly configs: Readonly<Record<ConfigName, Config>>;
};

interface Upstream<ConfigName extends string> {
  readonly rules: Readonly<Record<string, unknown>>;
  readonly configs: Readonly<Record<ConfigName, unknown>>;
}

type RulesOf = (rules: Readonly<Record<string, unknown>>) => Readonly<Record<string, CreateRule>>;

const isRule = (rule: unknown): rule is CreateRule =>
  Predicate.hasProperty(rule, "create") && Predicate.isFunction(rule.create);

const plainRules: RulesOf = Record.filter(isRule);

const ruleIdOf = (key: string): string => Arr.lastNonEmpty(Str.split(key, "/"));

const configOf =
  (name: string) =>
  (config: unknown): Config => ({
    rules: pipe(
      Arr.ensure(config),
      Arr.flatMap((entry) => Option.toArray(rulesOf(entry))),
      Arr.flatMap(Record.toEntries),
      Record.fromEntries,
      Record.filter(Schema.is(Severities)),
      Record.mapKeys((key) => `${name}/${ruleIdOf(key)}`),
    ),
  });

const upstreamPlugin = <ConfigName extends string>(
  name: string,
  upstream: Upstream<ConfigName>,
  rulesOfUpstream: RulesOf,
): UpstreamPlugin<ConfigName> => ({
  meta: { name },
  configs: pipe(upstream.configs, Record.map(configOf(name))),
  rules: rulesOfUpstream(upstream.rules),
});

export type { Config, RulesOf, Severity, Upstream, UpstreamPlugin };
export { plainRules, upstreamPlugin };
