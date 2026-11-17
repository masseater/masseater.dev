import { Record as Rec } from "effect";
import type { UserConfig } from "vite-plus";

import type { WorkspaceSettings } from "#/features/build-workspace-settings/index.ts";

type Tasks = NonNullable<NonNullable<UserConfig["run"]>["tasks"]>;

export interface TaskOptions {
  readonly workspace: WorkspaceSettings;
  readonly commands: Readonly<Record<string, string>>;
}

const NOT_INPUTS = [
  "!node_modules/.pnpm-store",
  "!node_modules/.pnpm-store/**",
  "!node_modules/.tmp",
  "!node_modules/.tmp/**",
  "!target/**",
  "!node_modules/.vitest-cache/**",
  "!node_modules/.cache/**",
];

const UNTRACKED_ENV = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_AI_GATEWAY_ID",
  "CLOUDFLARE_API_TOKEN",
  "CLAUDECODE",
  "CLAUDE_CODE_REMOTE",
  "GITHUB_ACTIONS",
  "HTTPS_PROXY",
  "https_proxy",
  "NO_PROXY",
  "no_proxy",
  "SSL_CERT_FILE",
  "NODE_EXTRA_CA_CERTS",
];

const FALLOW = [
  "fallow --skip dupes --fail-on-issues --quiet --format compact",
  "fallow dead-code --no-production --fail-on-issues --quiet --format compact",
  "fallow dead-code --no-production --quiet --format json | jq -n 'input | {prop_drilling_chains, thin_wrappers, duplicate_prop_shapes} | with_entries(select(.value | length > 0)) | if length > 0 then halt_error else empty end'",
  "fallow dupes --fail-on-issues --quiet --format compact",
  "fallow security --fail-on-issues --quiet",
];

const CHECK =
  "GOMEMLIMIT=4GiB TSRS_LINT_RUN_EXTERNAL_CODE=1 effect-tsgo --tsrs-lint vp check --deny-warnings --continue-on-error";

const AUDIT =
  'before="$(cksum pnpm-workspace.yaml)"; vp pm audit --fix || exit; if [ "$before" != "$(cksum pnpm-workspace.yaml)" ]; then echo "vp pm audit --fix rewrote pnpm-workspace.yaml. Run vp install and commit the diff." >&2; exit 1; fi';

export const tasksOf = ({
  workspace,
  commands,
}: TaskOptions): NonNullable<NonNullable<UserConfig["run"]>["tasks"]> => {
  const inputs = [{ auto: true }, ...workspace.ignoredDirectories, ...NOT_INPUTS];
  const checks: Tasks = {
    fallow: {
      command: FALLOW,
      cache: {
        input: [...inputs, "!.fallow/**", "!**/dist/**", "!**/.fallow-verified"],
        output: [],
      },
    },
    check: {
      command: CHECK,
      cache: { input: inputs, untrackedEnv: UNTRACKED_ENV },
    },
    test: {
      command: "vp test run",
      dependsOn: ["check"],
      cache: { input: [...inputs, "!**/.cache/**"] },
    },
    msch: { command: "msch", dependsOn: ["check", ...workspace.tasks.native], cache: false },
    audit: { command: AUDIT, cache: false },
    ...commands,
  };
  return {
    ...checks,
    verify: { command: [], dependsOn: [...workspace.tasks.verify, ...Rec.keys(checks)] },
  };
};
