import type { ToolSections } from "@r_masseater/vp-tools";
import fsd from "@r_masseater/vp-tools/fsd";
import { Array as Arr, pipe } from "effect";
import { INSTRUMENTATION, requiredStack } from "oxlint-masseater-plugin";
import type { UserConfig } from "vite-plus";

const PUBLIC_VALUES = [
  String.raw`\bCF_BEACON_TOKEN = "[0-9a-f]{32}"`,
  String.raw`\bOWNER_DISCORD_ID = "[0-9]{17,20}"`,
];

const UNTRACKED_SKILL_EXAMPLE = String.raw`(attributes["git.sha"] == "f4ab1c402143011a6264a0660f598fc02eb48bff" && attributes["path"] == "docs/skills/measure-dont-guess/SKILL.md")`;

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
    )}]) || ${UNTRACKED_SKILL_EXAMPLE}`,
  },
  steiger: [
    ...fsd.configs.recommended,
    {
      rules: {
        "fsd/no-cross-imports": "error",
        "fsd/no-higher-level-imports": "error",
        "fsd/no-wildcard-exports": "error",
      },
    },
  ],
  textlint: {
    ignores: [
      "**/AGENTS.md",
      ".agents/skills/**",
      ".claude/worktrees/**",
      "apps/zenn-articles/**",
      "**/.venv/**",
      "**/.cache/**",
    ],
    rules: {
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

const checkTasks: NonNullable<NonNullable<UserConfig["run"]>["tasks"]> = {
  "dependency-rules": "vp-tools dependencies",
  "markdown-lint": [
    "vp-tools textlint '**/*.md'",
    `vp-tools textlint --print-files '**/*.md' | xargs -0 -r -n 1 -P 4 python3 "$(skills ls --json | jq -r '.[] | select(.name == "yomiyasu").path')/scripts/yomiyasu_lint.py" --strict`,
  ],
  steiger: "vp-tools steiger apps/*/src",
  betterleaks: {
    command: `vp-tools betterleaks sh -c 'base="$(git rev-parse -q --verify "$BETTERLEAKS_BASE" 2>/dev/null || true)"; if [ -n "$base" ]; then betterleaks git . --redact --no-banner --revision="$base..HEAD"; elif [ "$(git rev-parse --is-shallow-repository)" = "true" ] || git config --get remote.origin.promisor >/dev/null; then tmp="$(mktemp -d)"; git archive HEAD | tar -x -C "$tmp"; betterleaks "$tmp" --redact --no-banner; code=$?; rm -rf "$tmp"; exit $code; else betterleaks git . --redact --no-banner; fi'`,
    cache: false,
  },
  "betterleaks:staged": {
    command: `git diff --cached --no-ext-diff --no-textconv --no-color --src-prefix=a/ --dst-prefix=b/ | vp-tools betterleaks betterleaks stdin --git-diff --redact --no-banner`,
    cache: false,
  },
};

export { checkTasks, checks };
