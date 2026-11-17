import presetJa from "@r_masseater/textlint-rule-preset-ja";
import type { ToolSections } from "@r_masseater/vite-plus-adopt";
import { Option, Predicate, Record as Rec, pipe } from "effect";

import { JAPANESE } from "#/shared/config/index.ts";

import { requireWithY8Kuromojin } from "./kuromojin.config.ts";

type Preset = NonNullable<NonNullable<ToolSections["textlint"]>["presets"]>[string];
type Rule = Preset["rules"][string];
type Reporter = Extract<Rule, (...args: never) => unknown>;
type Fixable = Exclude<Rule, Reporter>;

const NO_HANDLERS = {};

const isPreset = (value: unknown): value is Preset =>
  Predicate.hasProperty(value, "rules") &&
  Predicate.isObject(value.rules) &&
  Predicate.hasProperty(value, "rulesConfig") &&
  Predicate.isObject(value.rulesConfig);

const presetIn = (value: unknown): Option.Option<Preset> => {
  if (isPreset(value)) {
    return Option.some(value);
  }
  if (Predicate.hasProperty(value, "default")) {
    return presetIn(value.default);
  }
  return Option.none();
};

const required = requireWithY8Kuromojin(import.meta.url);

const presetOf = (specifier: string, loaded: unknown): Preset =>
  Option.getOrThrowWith(
    presetIn(loaded),
    () => new TypeError(`${specifier} does not export a textlint preset`),
  );

const japaneseOnly =
  (reporter: Reporter): Reporter =>
  (context, options) => {
    if (JAPANESE.test(context.getSource())) {
      return reporter(context, options);
    }
    return NO_HANDLERS;
  };

const forJapanese = (rule: Reporter | Readonly<Fixable>): Rule => {
  if (Predicate.isFunction(rule)) {
    return japaneseOnly(rule);
  }
  return { linter: japaneseOnly(rule.linter), fixer: japaneseOnly(rule.fixer) };
};

const japanesePreset = (specifier: string, loaded: unknown): Preset => {
  const { rules, rulesConfig } = presetOf(specifier, loaded);
  return { rules: pipe(rules, Rec.map(forJapanese)), rulesConfig };
};

export const textlintPresets: NonNullable<NonNullable<ToolSections["textlint"]>["presets"]> = {
  "@r_masseater/preset-ja": japanesePreset("@r_masseater/textlint-rule-preset-ja", presetJa),
  "@textlint-ja/preset-ai-writing": japanesePreset(
    "@textlint-ja/textlint-rule-preset-ai-writing",
    required("@textlint-ja/textlint-rule-preset-ai-writing"),
  ),
  "preset-ja-technical-writing": japanesePreset(
    "textlint-rule-preset-ja-technical-writing",
    required("textlint-rule-preset-ja-technical-writing"),
  ),
};
