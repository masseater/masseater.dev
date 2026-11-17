import { createRequire } from "node:module";

import presetJa from "@r_masseater/textlint-rule-preset-ja";
import type { ToolSections } from "@r_masseater/vite-plus-adopt";
import { Option, Predicate, Record as Rec } from "effect";

import { JAPANESE } from "#/shared/config/japanese.ts";

type Preset = NonNullable<NonNullable<ToolSections["textlint"]>["presets"]>[string];
type Rule = Preset["rules"][string];
type Reporter = Extract<Rule, (...args: never) => unknown>;

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

const required = createRequire(import.meta.url);

const loadPreset = (specifier: string): Preset => {
  const loaded: unknown = required(specifier);
  return Option.getOrThrowWith(
    presetIn(loaded),
    () => new TypeError(`${specifier} does not export a textlint preset`),
  );
};

const japaneseOnly =
  (reporter: Reporter): Reporter =>
  (context, options) =>
    JAPANESE.test(context.getSource()) ? reporter(context, options) : NO_HANDLERS;

const forJapanese = (rule: Rule): Rule =>
  Predicate.isFunction(rule)
    ? japaneseOnly(rule)
    : { linter: japaneseOnly(rule.linter), fixer: japaneseOnly(rule.fixer) };

const japanesePreset = (preset: Preset): Preset => ({
  rules: Rec.map(preset.rules, forJapanese),
  rulesConfig: preset.rulesConfig,
});

export const textlintPresets: NonNullable<NonNullable<ToolSections["textlint"]>["presets"]> = {
  "@r_masseater/preset-ja": japanesePreset(presetJa),
  "@textlint-ja/preset-ai-writing": japanesePreset(
    loadPreset("@textlint-ja/textlint-rule-preset-ai-writing"),
  ),
  "preset-ja-technical-writing": japanesePreset(
    loadPreset("textlint-rule-preset-ja-technical-writing"),
  ),
};
