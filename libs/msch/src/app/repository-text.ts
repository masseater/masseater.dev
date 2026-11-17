import type { H56mConfig } from "@r_masseater/h56m";
import type { ToolSections } from "@r_masseater/vite-plus-adopt";
import { Array as Arr, pipe } from "effect";

import { textlintPresets } from "#/features/define-lint-preset/index.ts";

export interface TextOptions {
  readonly ignores?: readonly string[];
  readonly kanji?: readonly string[];
  readonly technicalWriting?: Readonly<Record<string, boolean | object>>;
  readonly rules?: Readonly<Record<string, boolean | object>>;
  readonly filters?: Readonly<Record<string, boolean | object>>;
  readonly sources?: NonNullable<NonNullable<ToolSections["textlint"]>["sources"]>;
}

export interface SecretOptions {
  readonly lines?: readonly string[];
  readonly paths?: readonly string[];
}

const TEXT_IGNORES = ["AGENTS.md", ".agents/skills/**", "CHANGELOG.md"];
const SENTENCE_LENGTH = 120;
const KANJI_RUN = 6;
const PUBLIC_LINES = [String.raw`\bCF_BEACON_TOKEN = "[0-9a-f]{32}"`];

export const textlintOf = ({
  ignores = [],
  kanji = [],
  technicalWriting = {},
  rules = {},
  filters = {},
  sources = [],
}: TextOptions): NonNullable<ToolSections["textlint"]> => ({
  ignores: [...TEXT_IGNORES, ...ignores],
  presets: textlintPresets,
  sources,
  filters: { ...filters },
  rules: {
    "@textlint-ja/preset-ai-writing": true,
    "@r_masseater/preset-ja": true,
    "preset-ja-technical-writing": {
      "sentence-length": { max: SENTENCE_LENGTH },
      "ja-no-mixed-period": { allowPeriodMarks: [":"] },
      "no-mix-dearu-desumasu": { preferInBody: "である", preferInList: "である" },
      "max-kanji-continuous-len": { max: KANJI_RUN, allow: [...kanji] },
      ...technicalWriting,
    },
    ...rules,
  },
});

const anyOf =
  (subject: string) =>
  (patterns: readonly string[]): readonly string[] => {
    if (Arr.isReadonlyArrayEmpty(patterns)) {
      return [];
    }
    const listed = pipe(
      patterns,
      Arr.map((pattern) => `\`${pattern}\``),
      Arr.join(", "),
    );
    return [`matchesAny(${subject}, [${listed}])`];
  };

export const secretsOf = ({ lines = [], paths = [] }: SecretOptions): H56mConfig => ({
  extend: { useDefault: true },
  filter: pipe(
    [...anyOf("finding.line")([...PUBLIC_LINES, ...lines]), ...anyOf(`attributes["path"]`)(paths)],
    Arr.join(" || "),
  ),
});
