import { defineConfig } from "vite-plus";

import { checks, checkTasks, packageChecks } from "./checks.config.ts";
import { lint } from "./lint.config.ts";

export default defineConfig({
  ...checks,
  test: {
    projects: [
      "apps/*",
      "libs/*",
      "infra/*",
      "tools/*",
      "!apps/zenn-articles",
      "!tools/mosaic",
      "!tools/seikin-dance",
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
      "actions-lint": {
        command:
          'vpa actionlint && vpa zizmor $(test -n "$CLAUDE_CODE_REMOTE" && echo --no-online-audits) .github && ast-grep scan --rule .github/rules/no-full-history-checkout.yml .github/workflows',
        cache: {
          env: ["CLAUDE_CODE_REMOTE"],
          untrackedEnv: [
            "GH_TOKEN",
            "HTTPS_PROXY",
            "https_proxy",
            "NO_PROXY",
            "no_proxy",
            "SSL_CERT_FILE",
          ],
        },
      },
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
          "dependency-rules",
          "markdown-lint",
          "renovate",
          "actions-lint",
          "steiger",
          "db-check-all",
          "fallow",
          "msch",
          "betterleaks",
          "ignored-sources",
          "audit",
          ...packageChecks,
        ],
      },
      test: "vp test run",
      msch: {
        command: "node libs/msch/src/cli.ts",
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
