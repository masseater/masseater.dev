import { presets as effectPresets } from "@effect/tsgo/oxlint-presets";
import htmlReact from "@html-eslint/eslint-plugin-react";
import eslintReact from "@r_masseater/oxlint-typed-rules/react";
import { Array as Arr, Record as Rec, String as Str, Struct, pipe } from "effect";
import reactHooks from "eslint-plugin-react-hooks";

import decisionPlugin from "./decision-rules.ts";

export const generated = [
  "**/routeTree.gen.ts",
  "**/generated/**",
  "**/drizzle/**/snapshot.json",
  ".claude/skills/**",
  ".intent/**",
  "AGENTS.md",
  "skills-lock.json",
  ".github/release-please/*manifest.json",
  "**/.release-please-manifest.json",
  "**/*.d.rpp.ts",
  "**/src-tauri/gen/**",
];

const asErrors = (names: readonly string[]): Readonly<Record<string, "error">> =>
  Rec.fromEntries(
    pipe(
      names,
      Arr.map((name) => [name, "error"] as const),
    ),
  );

export const allRulesOf = ({
  prefix,
  rules,
}: Readonly<{ prefix: string; rules: Readonly<Record<string, unknown>> }>): Readonly<
  Record<string, "error">
> =>
  asErrors(
    pipe(
      Rec.keys(rules),
      Arr.map((rule) => `${prefix}/${rule}`),
    ),
  );

const reactHooksRuleNames = pipe(
  Struct.keys(reactHooks.configs["recommended-latest"].rules),
  Arr.map(Str.replace("react-hooks/", "react-hooks-js/")),
);

const reactHooksRules = asErrors(reactHooksRuleNames);

const eslintReactRuleNames = pipe(
  Rec.keys(eslintReact.configs["strict-typescript"].rules ?? {}),
  Arr.filter(
    (name) => !(Str.replace("@eslint-react/", "react-hooks-js/")(name) in reactHooksRules),
  ),
);

const effectRuleNames = pipe(
  Rec.values(effectPresets),
  Arr.flatMap((preset) => Struct.keys(preset.rules ?? {})),
);

export const pluginRules: Readonly<Record<string, "error">> = {
  ...asErrors(Rec.keys(htmlReact.configs.all.rules ?? {})),
  ...reactHooksRules,
  ...asErrors(eslintReactRuleNames),
  ...asErrors(effectRuleNames),
};

export const decisionPluginName = decisionPlugin.meta.name;

export const decisionRules = allRulesOf({
  prefix: decisionPluginName,
  rules: decisionPlugin.rules,
});

export const decisionTestRules = pipe(
  decisionRules,
  Rec.map(() => "off" as const),
);

export const shadcnRestyleContracts = [
  { pattern: "^Table(Head|Cell)$", allow: ["text-alignment", "fvn-spacing"] },
  { pattern: "^TableCaption$", allow: ["caption", "text-alignment", "mt-*", "mb-*"] },
];

export { COMMENT_DIRECTIVES } from "#/shared/lib/comment-directives.ts";
