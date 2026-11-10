import eslintReact from "@eslint-react/eslint-plugin";
import { Array as Arr, Option, Record, String as Str, pipe } from "effect";
import type { CreateRule, Plugin } from "vite-plus/lint/plugins";

import { rulesOf } from "./config-rules.ts";
import { isTypedRule, withOptionalTypeInformation, withTypeInformation } from "./typed-rule.ts";
import type { TypedRule } from "./typed-rule.ts";

interface Config {
  readonly rules?: Readonly<Record<string, unknown>> | undefined;
}

type ConfigName =
  | "all"
  | "disable-conflict-eslint-plugin-react"
  | "disable-conflict-eslint-plugin-react-hooks"
  | "disable-dom"
  | "disable-experimental"
  | "disable-jsx"
  | "disable-naming-convention"
  | "disable-rsc"
  | "disable-type-checked"
  | "disable-web-api"
  | "dom"
  | "jsx"
  | "naming-convention"
  | "off"
  | "recommended"
  | "recommended-type-checked"
  | "recommended-typescript"
  | "rsc"
  | "strict"
  | "strict-type-checked"
  | "strict-typescript"
  | "web-api"
  | "x";

type Configs = Readonly<Record<ConfigName, Config>>;

type ReactPlugin = Plugin & {
  readonly meta: { readonly name: string };
  readonly configs: Configs;
};

const PREFIX = "@eslint-react/";

const upstreamConfigs: Readonly<Record<ConfigName, unknown>> = eslintReact.configs;

const configs: Configs = pipe(
  upstreamConfigs,
  Record.map((config) => ({ rules: Option.getOrUndefined(rulesOf(config)) })),
);

const upstreamRules: Readonly<Record<string, unknown>> = Option.fromNullishOr(
  eslintReact.rules,
).pipe(Option.getOrElse(() => ({})));

const typeCheckedIds = Option.fromNullishOr(configs["disable-type-checked"].rules).pipe(
  Option.map(Record.keys),
  Option.getOrElse((): readonly string[] => []),
  Arr.map(Str.replace(PREFIX, "")),
);

const typeCheckedRules: ReadonlySet<unknown> = new Set(
  pipe(
    typeCheckedIds,
    Arr.flatMap((id) => Option.toArray(Record.get(upstreamRules, id))),
  ),
);

const withTypes = (rule: TypedRule): CreateRule =>
  Option.liftPredicate(rule, (candidate) => typeCheckedRules.has(candidate)).pipe(
    Option.match({ onSome: withTypeInformation, onNone: () => withOptionalTypeInformation(rule) }),
  );

const plugin: ReactPlugin = {
  meta: { name: "@eslint-react" },
  configs,
  rules: pipe(upstreamRules, Record.filter(isTypedRule), Record.map(withTypes)),
};

export type { Config, ConfigName, Configs, ReactPlugin };
export default plugin;
