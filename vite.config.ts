import {
  INSTRUMENTATION,
  decisionRules,
  decisionTestRules,
  generated,
  lint as preset,
  removalPolicySyntax,
  requiredStack,
  steigerRules,
  textlintPresets,
  tracedRules,
} from "@r_masseater/msch/lint";
import type { ToolSections } from "@r_masseater/msch/vite";
import { workspaceSettings } from "@r_masseater/msch/workspace-settings";
import type { RuleSets } from "@r_masseater/msch/workspace-settings";
import { restrictedSyntax as unguardedWorkersAi } from "@r_masseater/workers-tracing/oxlint";
import { Array as Arr, Record as Rec, pipe } from "effect";
import { defineConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";

type LintConfig = NonNullable<UserConfig["lint"]>;

const ruleSets: RuleSets = { decision: decisionRules, traced: tracedRules };

const workspace = await workspaceSettings({
  root: import.meta.dirname,
  ruleSets,
  dependencySets: { instrumentation: requiredStack[INSTRUMENTATION] ?? [] },
});

const overrides = [
  {
    files: [...workspace.lint.shadcnUi],
    rules: { "react/jsx-props-no-spreading": "off" },
  },
  {
    files: [...workspace.lint.publicEntries],
    rules: { "import/no-default-export": "off" },
  },
  {
    files: ["apps/*/src/**/*.{ts,tsx}", "apps/*/worker/**/*.ts"],
    excludeFiles: ["**/*.test.ts"],
    rules: {
      "eslint-js/no-restricted-syntax": ["error", removalPolicySyntax, ...unguardedWorkersAi],
    },
  },
  ...workspace.lint.overrides,
  {
    files: ["**/*.test.ts"],
    rules: decisionTestRules,
  },
] satisfies LintConfig["overrides"];

const lint = {
  ...preset,
  ignorePatterns: [...generated, ...workspace.lint.ignorePatterns],
  overrides: [...preset.overrides, ...overrides],
} satisfies LintConfig;

const PUBLIC_VALUES = [
  String.raw`\bCF_BEACON_TOKEN = "[0-9a-f]{32}"`,
  String.raw`\bOWNER_DISCORD_ID = "[0-9]{17,20}"`,
];

const FAKE_SECRET_FIXTURES = [String.raw`(^|/)fixtures/[^/]+\.tgz!`];

const MARKDOWN_IGNORES = ["AGENTS.md", "apps/zenn-articles/**", "**/.cache/**"];

const checks: ToolSections = {
  commitlint: { extends: ["@commitlint/config-conventional"] },
  dependencyRules: {
    allowed: pipe(
      workspace.devDependencies,
      Rec.map(({ workspaces, dependencies }) => ({
        workspaces,
        dependencies,
        fields: ["devDependencies"] as const,
      })),
    ),
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
    )}])`,
  },
  steiger: {
    paths: ["apps/*/src", "libs/*/src", "tools/*/src", "infra/*/src"],
    rules: steigerRules,
  },
  textlint: {
    ignores: MARKDOWN_IGNORES,
    presets: textlintPresets,
    rules: {
      "@r_masseater/preset-ja": { "no-taigendome": false },
      "@textlint-ja/preset-ai-writing": true,
      "preset-ja-technical-writing": {
        "sentence-length": { max: 120 },
        "ja-no-mixed-period": { allowPeriodMarks: [":"] },
        "no-mix-dearu-desumasu": { preferInBody: "である", preferInList: "である" },
        "max-kanji-continuous-len": {
          max: 6,
          allow: [
            "個人情報保護法",
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

export default defineConfig({
  ...checks,
  msch: {
    workspaceAgentsMd: true,
    comments: { allow: ["(?:note|pass|text|glyphs|dispatch):"] },
  },
  test: {
    projects: [...workspace.testProjects],
    passWithNoTests: true,
  },
  staged: {
    "*": "vp fmt --no-error-on-unmatched-pattern",
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
      fallow: {
        command: [
          "fallow --skip dupes --fail-on-issues --quiet --format compact",
          "fallow dead-code --no-production --fail-on-issues --quiet --format compact",
          "fallow dead-code --no-production --quiet --format json | jq -n 'input | {prop_drilling_chains, thin_wrappers, duplicate_prop_shapes} | with_entries(select(.value | length > 0)) | if length > 0 then halt_error else empty end'",
          "fallow dupes --fail-on-issues --quiet --format compact",
          "fallow security --fail-on-issues --quiet",
        ],
        cache: {
          input: [
            { auto: true },
            "!.fallow/**",
            "!target/**",
            "!**/dist/**",
            "!node_modules/.vitest-cache/**",
            "!node_modules/.cache/**",
            "!**/.fallow-verified",
          ],
          output: [],
        },
      },
      "workflow-rules":
        "ast-grep scan --rule .github/rules/no-full-history-checkout.yml .github/workflows",
      check: {
        command: "GOMEMLIMIT=4GiB vp check --deny-warnings",
        cache: {
          env: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_AI_GATEWAY_ID"],
          untrackedEnv: [
            "CLOUDFLARE_API_TOKEN",
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
      },
      verify: {
        command: [],
        dependsOn: [
          ...workspace.tasks.verify,
          "check",
          "test",
          "workflow-rules",
          "db-check-all",
          "fallow",
          "msch",
          "ignored-sources",
          "audit",
        ],
      },
      test: {
        command: "vp test run",
        cache: {
          input: [{ auto: true }, "!**/.cache/**", "!target/**", "!node_modules/.vitest-cache/**"],
        },
      },
      msch: {
        command: "msch",
        cache: false,
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
