import { createRequire } from "node:module";

import presetJa from "@r_masseater/textlint-rule-preset-ja";
import type { ToolSections } from "@r_masseater/vite-plus-adopt";
import { Option, Predicate } from "effect";

type Preset = NonNullable<NonNullable<ToolSections["textlint"]>["presets"]>[string];

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

export const textlintPresets: NonNullable<NonNullable<ToolSections["textlint"]>["presets"]> = {
  "@r_masseater/preset-ja": presetJa,
  "@textlint-ja/preset-ai-writing": loadPreset("@textlint-ja/textlint-rule-preset-ai-writing"),
  "preset-ja-technical-writing": loadPreset("textlint-rule-preset-ja-technical-writing"),
};
