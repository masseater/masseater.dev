import { INSTRUMENTATION, requiredStack } from "@r_masseater/msch/lint";
import type { ToolSections } from "@r_masseater/vite-plus-adopt";
import fsd from "@r_masseater/vite-plus-adopt/fsd";
import { Array as Arr, String as Str, pipe } from "effect";
import type { UserConfig } from "vite-plus";

const PUBLIC_VALUES = [
  String.raw`\bCF_BEACON_TOKEN = "[0-9a-f]{32}"`,
  String.raw`\bOWNER_DISCORD_ID = "[0-9]{17,20}"`,
];

const FAKE_SECRET_FIXTURES = [
  String.raw`(^|/)libs/vite-plus-adopt/upstream/attw-core/fixtures/[^/]+\.tgz!`,
  String.raw`(^|/)libs/oxlint-plugin-decision-presets/example/fail\.js$`,
];

const UNTRACKED_SKILL_EXAMPLE = String.raw`(attributes["git.sha"] == "f4ab1c402143011a6264a0660f598fc02eb48bff" && attributes["path"] == "docs/skills/measure-dont-guess/SKILL.md")`;

const MARKDOWN_IGNORES = [
  "AGENTS.md",
  ".agents/skills/**",
  ".claude/worktrees/**",
  "apps/zenn-articles/**",
  "**/.cache/**",
];

const checks: ToolSections = {
  commitlint: { extends: ["@commitlint/config-conventional"] },
  dependencyRules: {
    allowed: {
      "OTLP の受け口は OpenTelemetry の SDK から送ってテストする": {
        workspaces: ["libs/vitest-otlp"],
        dependencies: requiredStack[INSTRUMENTATION] ?? [],
        fields: ["devDependencies"],
      },
      "Workers のスパンは Miniflare で Worker を動かしてテストする": {
        workspaces: ["libs/vitest-otlp", "libs/workers-tracing"],
        dependencies: ["miniflare"],
        fields: ["devDependencies"],
      },
    },
    banned: requiredStack,
    peerRanges: "intersect",
  },
  betterleaks: {
    extend: { useDefault: true },
    filter: `matchesAny(finding.line, [${pipe(
      PUBLIC_VALUES,
      Arr.map((pattern) => `\`${pattern}\``),
      Arr.join(", "),
    )}]) || matchesAny(attributes["path"], [${pipe(
      FAKE_SECRET_FIXTURES,
      Arr.map((pattern) => `\`${pattern}\``),
      Arr.join(", "),
    )}]) || ${UNTRACKED_SKILL_EXAMPLE}`,
  },
  steiger: {
    paths: ["apps/*/src"],
    rules: [
      ...fsd.configs.recommended,
      {
        rules: {
          "fsd/no-cross-imports": "error",
          "fsd/no-higher-level-imports": "error",
          "fsd/no-wildcard-exports": "error",
        },
      },
    ],
  },
  textlint: {
    ignores: MARKDOWN_IGNORES,
    rules: {
      "@masseater.dev/yomiyasu": true,
      "@textlint-ja/preset-ai-writing": true,
      "preset-ja-technical-writing": {
        "sentence-length": { max: 120 },
        "ja-no-mixed-period": { allowPeriodMarks: [":"] },
        "no-mix-dearu-desumasu": { preferInBody: "である", preferInList: "である" },
        "max-kanji-continuous-len": {
          max: 6,
          allow: [
            "外国電子決済手段",
            "電子決済手段等取引業",
            "前払式支払手段",
            "犯罪収益移転防止法",
            "事業者間取引適正化等法",
            "個人情報保護法",
            "特定商取引法",
            "電気通信利用役務",
            "特定業務委託事業者",
            "中小企業基盤整備機構",
            "小規模企業共済",
            "中小企業倒産防止共済",
          ],
        },
        "no-exclamation-question-mark": { allow: ["ぶいあーる!", "超かぐや姫!", "超かぐや姫！"] },
      },
    },
  },
};

const CARGO_TASK = "#cargo";

const packageChecks: readonly string[] = [
  "sloppedia#size",
  "@r_masseater/oxlint-plugin-decision#test",
  "@r_masseater/oxlint-plugin-decision-presets#test",
  "@r_masseater/oxlint-typed-rules#test",
  "@r_masseater/oxlint-typed-rules#size",
  "@r_masseater/vite-plus-adopt#test",
  "@r_masseater/vite-plus-adopt#size",
  "@masseater.dev/pod-rattle-engine#cargo",
  "@masseater.dev/pod-rattle-plugin#cargo",
  "@masseater.dev/pod-rattle-host#cargo",
  "@masseater.dev/mosaic-build#cargo",
  "@masseater.dev/seikin-dance#cargo",
  "@masseater.dev/xtask#cargo",
  "rpp-kit-demo#typecheck",
  "sts2-mods#dotnet",
  "aredoko-desktop#cargo",
  "yakusu#cargo",
  "aredoko-protocol-codegen#codegen:check",
  "medley-manager#auth:check",
  "watashi-mcp#auth:check",
  "aredoko-csharp-check#cs:check",
];

const cargoChecks = pipe(
  packageChecks,
  Arr.filter(Str.endsWith(CARGO_TASK)),
  Arr.map((check) => `'${check}'`),
  Arr.join(" "),
);

const checkTasks: NonNullable<NonNullable<UserConfig["run"]>["tasks"]> = {
  vpa: {
    command: "vpa",
    cache: false,
  },
  "cargo-checks": {
    command: String.raw`crates="$(cargo metadata --no-deps --format-version 1 | jq -r '.packages[].manifest_path' | while read -r manifest; do directory="$(dirname "$manifest")"; until [ -f "$directory/package.json" ]; do directory="$(dirname "$directory")"; done; jq -r '.name + "${CARGO_TASK}"' "$directory/package.json"; done | LC_ALL=C sort)"; listed="$(printf '%s\n' ${cargoChecks} | LC_ALL=C sort)"; if [ "$crates" != "$listed" ]; then printf 'The crates in Cargo.toml need these tasks:\n%s\npackageChecks in checks.config.ts lists these:\n%s\n' "$crates" "$listed" >&2; echo "The two lists must match. Give the package of each crate a cargo task and list it in packageChecks, or verify never lints or tests the crate." >&2; exit 1; fi`,
    cache: false,
  },
};

export { checkTasks, checks, packageChecks };
