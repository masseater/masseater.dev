import type { TextlintRcConfig } from "@textlint/config-loader";
import type { TextlintKernelRule } from "@textlint/kernel";
import { Array as Arr, Option, Predicate, Record as Rec, pipe } from "effect";

import type { TextlintConfig } from "./types.ts";

const NO_OPTIONS: Readonly<Record<string, unknown>> = {};

const isRuleOptions = Predicate.or(Predicate.isBoolean, Predicate.isReadonlyObject);

/** @internal */
export const presetRulesOf = (config: TextlintConfig): TextlintKernelRule[] => {
  const settings = config.rules ?? {};
  return pipe(
    Rec.toEntries(config.presets ?? {}),
    Arr.filter(([name]) => Boolean(settings[name])),
    Arr.flatMap(([name, preset]) => {
      const userOptions = pipe(
        Option.liftPredicate(settings[name], Predicate.isReadonlyObject),
        Option.getOrElse(() => NO_OPTIONS),
      );
      return pipe(
        Rec.toEntries(preset.rules),
        Arr.map(([key, rule]) => ({
          ruleId: `${name}/${key}`,
          rule,
          options: pipe(
            Rec.get(userOptions, key),
            Option.filter((value) => value !== true),
            Option.filter(isRuleOptions),
            Option.getOrElse(() => preset.rulesConfig[key] ?? true),
          ),
        })),
        Arr.filter(({ options }) => options !== false),
      );
    }),
  );
};

/** @internal */
export const rawConfigOf = (config: TextlintConfig): TextlintRcConfig => {
  const { ignores: _ignores, presets = {}, ...rawConfig } = config;
  return {
    ...rawConfig,
    rules: pipe(
      rawConfig.rules ?? {},
      Rec.filter((_setting, name) => !Rec.has(presets, name)),
    ),
  };
};
