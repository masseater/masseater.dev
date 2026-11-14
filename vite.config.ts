import {
  INFRASTRUCTURE,
  INSTRUMENTATION,
  decisionRules,
  decisionTestRules,
  generated,
  lint as preset,
  requiredStack,
  restrictedImports,
} from "@r_masseater/msch/lint";
import { workspaceLint } from "@r_masseater/msch/workspace-lint";
import type { RuleSets } from "@r_masseater/msch/workspace-lint";
import type { ToolSections } from "@r_masseater/vite-plus-adopt";
import fsd from "@r_masseater/vite-plus-adopt/fsd";
import {
  restrictedImports as untracedImports,
  restrictedProperties as untracedProperties,
  restrictedSyntax as unguardedWorkersAi,
} from "@r_masseater/workers-tracing/oxlint";
import { Array as Arr, String as Str, pipe } from "effect";
import { defineConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";

type LintConfig = NonNullable<UserConfig["lint"]>;

const isOtlpInterop = ({ message }: Readonly<{ message: string }>): boolean =>
  message !== INSTRUMENTATION && message !== INFRASTRUCTURE;

const otlpInteropImports = {
  paths: pipe(restrictedImports.paths, Arr.filter(isOtlpInterop)),
  patterns: pipe(restrictedImports.patterns, Arr.filter(isOtlpInterop)),
};

const ruleSets: RuleSets = {
  decision: decisionRules,
  traced: {
    "eslint/no-restricted-imports": [
      "error",
      { ...restrictedImports, paths: [...restrictedImports.paths, ...untracedImports] },
    ],
    "eslint/no-restricted-properties": ["error", ...untracedProperties],
  },
  otlpInterop: { "eslint/no-restricted-imports": ["error", otlpInteropImports] },
};

const workspace = await workspaceLint({ root: import.meta.dirname, ruleSets });

const overrides = [
  {
    files: ["**/shared/ui/**", ...workspace.shadcnUi],
    rules: { "shadcn/no-restyle": "off", "react/jsx-props-no-spreading": "off" },
  },
  {
    files: ["apps/*/src/**/*.{ts,tsx}", "apps/*/worker/**/*.ts"],
    excludeFiles: ["**/*.test.ts"],
    rules: { "eslint-js/no-restricted-syntax": ["error", ...unguardedWorkersAi] },
  },
  ...workspace.overrides,
  {
    files: ["**/*.test.ts"],
    rules: decisionTestRules,
  },
] satisfies LintConfig["overrides"];

const lint = {
  ...preset,
  ignorePatterns: [...generated, ...workspace.ignorePatterns],
  rules: {
    ...preset.rules,
    "import/no-namespace": ["error", { ignore: ["linguist-languages"] }],
    "baseline-js/use-baseline": [
      "error",
      {
        available: "widely",
        includeWebApis: { preset: "auto" },
        includeJsBuiltins: { preset: "auto" },
        ignoreFeatures: ["webgpu"],
      },
    ],
    "eslint/new-cap": [
      "error",
      {
        capIsNewExceptions: [
          "App",
          "Build",
          "CloudflareApiLive",
          "Repository",
          "RepositorySettings",
          "Resource",
          "Ruleset",
          "Secret",
          "Stack",
        ],
        capIsNewExceptionPattern: String.raw`^(Argument|Config|Containers|Context|Data|Flag|Persistable|Schema|AnalyticsEngine|ApiToken|D1|KV|Logpush|R2|Ruleset|Rules|SecretsStore|Website|Workers|Zone)\.`,
      },
    ],
  },
  overrides: [...preset.overrides, ...overrides],
} satisfies LintConfig;

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
            "情報処理推進機構",
            "情報通信研究機構",
            "国立情報学研究所",
            "日本情報経済社会推進協会",
            "国立研究開発法人",
            "大学共同利用機関",
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
  "@r_masseater/msch#build",
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
  "yohaku-desktop#cargo",
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
    command: String.raw`crates="$(cargo metadata --no-deps --format-version 1 | jq -r '.packages[].manifest_path' | while read -r manifest; do directory="$(dirname "$manifest")"; until [ -f "$directory/package.json" ]; do directory="$(dirname "$directory")"; done; jq -r '.name + "${CARGO_TASK}"' "$directory/package.json"; done | LC_ALL=C sort)"; listed="$(printf '%s\n' ${cargoChecks} | LC_ALL=C sort)"; if [ "$crates" != "$listed" ]; then printf 'The crates in Cargo.toml need these tasks:\n%s\npackageChecks in vite.config.ts lists these:\n%s\n' "$crates" "$listed" >&2; echo "The two lists must match. Give the package of each crate a cargo task and list it in packageChecks, or verify never lints or tests the crate." >&2; exit 1; fi`,
    cache: false,
  },
};

export default defineConfig({
  ...checks,
  test: {
    projects: [
      "apps/*",
      "libs/*",
      "infra/*",
      "tools/*",
      "!apps/zenn-articles",
      "!libs/oxlint-plugin-decision",
      "!libs/oxlint-plugin-decision-presets",
      "!libs/oxlint-typed-rules",
      "!libs/vite-plus-adopt",
    ],
    passWithNoTests: true,
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: lint.ignorePatterns,
    sortImports: true,
    sortTailwindcss: true,
    sortPackageJson: true,
  },
  lint,
  run: {
    cache: true,
    tasks: {
      ...checkTasks,
      renovate: "renovate-config-validator --strict",
      fallow: [
        "fallow --skip dupes --fail-on-issues --quiet --format compact",
        "fallow dead-code --no-production --fail-on-issues --quiet --format compact",
        "fallow dead-code --no-production --quiet --format json | jq -n 'input | {prop_drilling_chains, thin_wrappers, duplicate_prop_shapes} | with_entries(select(.value | length > 0)) | if length > 0 then halt_error else empty end'",
        "fallow dupes --fail-on-issues --quiet --format compact",
        "fallow security --fail-on-issues --quiet",
      ],
      "workflow-rules":
        "ast-grep scan --rule .github/rules/no-full-history-checkout.yml .github/workflows",
      verify: {
        command: "GOMEMLIMIT=4GiB vp check --deny-warnings",
        cache: {
          env: ["OPENROUTER_API_KEY"],
          untrackedEnv: [
            "CLAUDECODE",
            "CLAUDE_CODE_REMOTE",
            "HTTPS_PROXY",
            "https_proxy",
            "NO_PROXY",
            "no_proxy",
            "SSL_CERT_FILE",
            "NODE_EXTRA_CA_CERTS",
          ],
        },
        dependsOn: [
          "test",
          "vpa",
          "renovate",
          "workflow-rules",
          "cargo-checks",
          "db-check-all",
          "fallow",
          "msch",
          "ignored-sources",
          "audit",
          ...packageChecks,
        ],
      },
      test: "vp test run",
      msch: {
        command: "msch",
        cache: {
          untrackedEnv: ["HTTPS_PROXY", "https_proxy", "NO_PROXY", "no_proxy", "SSL_CERT_FILE"],
        },
      },
      "db-check-all": "vp run -r db:check",
      audit: {
        command:
          'before="$(cksum pnpm-workspace.yaml)"; vp pm audit --fix || exit; if [ "$before" != "$(cksum pnpm-workspace.yaml)" ]; then echo "vp pm audit --fix rewrote pnpm-workspace.yaml. Run vp install and commit the diff." >&2; exit 1; fi',
        cache: false,
      },
      "ignored-sources": {
        command: String.raw`ignored="$(git ls-files --others --ignored --exclude-standard -- ":(glob)**/src/**" ":(exclude,glob)**/node_modules/**")"; if [ -n "$ignored" ]; then printf "%s\n" "$ignored" >&2; echo "These files under src/ are ignored by .gitignore, so verify passes here but they never reach the commit. Narrow the pattern in .gitignore." >&2; exit 1; fi`,
        cache: false,
      },
    },
  },
});
