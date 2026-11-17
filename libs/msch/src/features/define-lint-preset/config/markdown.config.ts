import { definePlugin, defineRule } from "@r_masseater/y8";
import type { Y8Config, RuleEntry } from "@r_masseater/y8";
import { Array as Arr, Record as Rec, String as Str, pipe } from "effect";

const README = /(?:^|\/)README\.md$/iu;
const README_LINES = 150;
const NEXT_LINE = 1;
const HEADING_MARKS = /^#+\s*|\s*#*$/gu;
const API_HEADING =
  /^(?:api|api reference|options|configuration|parameters|props|reference|オプション|設定項目|リファレンス)$/iu;

const readmeLength = defineRule({
  meta: { description: "A README stays short: the code and its types hold the details" },
  create: (context) => ({
    document: (): void => {
      if (!README.test(context.filename) || context.lines.length <= README_LINES) {
        return;
      }
      context.report({
        line: README_LINES + NEXT_LINE,
        message: `README is longer than ${String(README_LINES)} lines; keep only what a reader needs to start`,
      });
    },
  }),
});

const readmeApiSection = defineRule({
  meta: { description: "A README has no API or option reference that repeats the types" },
  create: (context) => ({
    heading: (node): void => {
      if (!README.test(context.filename)) {
        return;
      }
      const title = pipe(context.textOf(node), Str.replaceAll(HEADING_MARKS, ""));
      if (API_HEADING.test(title)) {
        context.report({
          node,
          message: "README repeats the API; link the types or the source instead",
        });
      }
    },
  }),
});

const masseater = definePlugin({
  rules: { "readme-length": readmeLength, "readme-api-section": readmeApiSection },
});

const ERROR: RuleEntry = "error";

const MASSEATER_RULES: Readonly<Record<string, RuleEntry>> = pipe(
  ["readme-length", "readme-api-section"],
  Arr.map((name): readonly [string, RuleEntry] => [`masseater/${name}`, ERROR]),
  Rec.fromEntries,
);

const MARKDOWN_RULES: Readonly<Record<string, RuleEntry>> = {
  "markdownlint/MD013": "off",
  "markdownlint/MD034": "off",
  "markdownlint/MD041": "off",
  "markdownlint/MD060": "off",
  "markdownlint/MD024": ["error", { siblings_only: true }],
  "markdownlint/MD026": ["error", { punctuation: ".,;:。，；：" }],
};

const MARKDOWN_IGNORES = [".agents/skills/**", "**/fixtures/**", "**/upstream/**", "CHANGELOG.md"];

export interface MarkdownOptions {
  readonly ignores?: readonly string[];
  readonly rules?: Readonly<Record<string, RuleEntry>>;
}

export const markdownOf = ({ ignores = [], rules = {} }: MarkdownOptions): Y8Config => ({
  plugins: { masseater },
  rules: { ...MARKDOWN_RULES, ...MASSEATER_RULES, ...rules },
  ignores: [...MARKDOWN_IGNORES, ...ignores],
});
