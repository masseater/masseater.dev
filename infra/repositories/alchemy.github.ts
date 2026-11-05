import { providers as cloudflareProviders, state } from "@alchemy.run/cloudflare";
import { Repository, Ruleset, providers as gitHubProviders } from "@alchemy.run/github";
import type { RepositoryProps, RulesetProps } from "@alchemy.run/github";
import { Stack } from "alchemy";
import type { CompiledStack } from "alchemy";
import { adopt } from "alchemy/AdoptPolicy";
import { Array as Arr, Effect, Layer, pipe } from "effect";
import type { ConfigError } from "effect/Config";

import { OWNER, hasUpToDateWorkflow, repositories } from "./github-repositories.ts";
import type { ManagedRepository } from "./github-repositories.ts";
import { settingsOf, settingsProvider } from "./github-repository-settings.ts";

const GITHUB_ACTIONS_APP_ID = 15_368;

const MERGE_POLICY = {
  allowSquashMerge: true,
  allowMergeCommit: false,
  allowRebaseMerge: false,
  deleteBranchOnMerge: true,
} as const satisfies Partial<RepositoryProps>;

const PUBLIC_POLICY = {
  ...MERGE_POLICY,
  allowAutoMerge: true,
} as const satisfies Partial<RepositoryProps>;

const PUBLIC_PROFILES: Readonly<Record<string, Pick<RepositoryProps, "description" | "homepage">>> =
  {
    "masseater.dev": {
      description: "Portfolio at https://masseater.dev",
      homepage: "https://masseater.dev",
    },
    "typescript-template": {
      description:
        "Cloudflare で動く TypeScript の Web アプリを、検査・CI・デプロイ・AI エージェントの決まりがそろった状態から始めるテンプレート",
    },
    mirucord: {
      description:
        "Read-only Discord MCP server with semantic search, hosted on Cloudflare. Self-hostable.",
      homepage: "https://mirucord.masseater.dev",
    },
    konomi: {
      description:
        "見た動画・聴いた曲・高評価を自分の Cloudflare に集め、AI が MCP で読めるようにする",
      homepage: "https://konomi.masseater.dev",
    },
    "medley-database": {
      description: "ニコメドや合作動画で使われた曲と動画を逆引きできるメドDB",
      homepage: "https://medley-manager.masseater.dev",
    },
    "rpp-kit": {
      description: "REAPER のプロジェクトファイル（.rpp）を TypeScript から直接読むキット",
      homepage: "https://masseater.dev/rpp-kit/",
    },
    "decision-experiments": {
      description: "OpenRouter の decision モデルで文書の中身を安く速く判定できるかを試す実験",
      homepage: "https://masseater.dev/injection-bisect/",
    },
    "measure-everything": {
      description: "OpenTelemetry と各ツールの公式の拡張点に差し込んで計測する部品集",
    },
    aredoko: {
      description: "Unityエディタ内でアセットを見た目・自然言語で探す検索拡張",
    },
    "ai-produced": {
      description: "AI がボカロPと同じ工程を踏んで曲を作れるかを確かめる実験",
    },
    "cc-jev-teacher": {
      description:
        "Claude Code plugin: TypeSafe-judged hooks that make Claude finish the job before it reports",
    },
    cdmm: {
      description: "Run multiple Claude Max accounts in the official Claude Desktop on Windows",
    },
    msa: {
      description: "Masseater agent. based on pi.",
    },
    skills: {
      description: "masseater's shared agent skills, installed with the skills CLI",
    },
    "sts2-mods": {
      description: "Slay the Spire 2 の Mod をまとめて管理する monorepo",
    },
    "homebrew-tap": {
      description: "Homebrew tap for masseater's tools",
    },
  };

const ARCHIVES: ReadonlySet<string> = new Set([
  "mst-ja-decision-bench",
  "oxlint-typed-rules",
  "thumb-mosaic",
  "vocablint",
]);

const isArchiving = (repository: ManagedRepository): boolean => ARCHIVES.has(repository.name);

const policyOf = (repository: ManagedRepository): Partial<RepositoryProps> => {
  if (isArchiving(repository)) {
    return { archived: true };
  }
  if (repository.private) {
    return MERGE_POLICY;
  }
  return { ...PUBLIC_POLICY, ...PUBLIC_PROFILES[repository.name] };
};

const rulesOf = (
  upToDate: boolean,
): Pick<RulesetProps, "deletion" | "nonFastForward" | "requiredStatusChecks"> => {
  const protection = { deletion: true, nonFastForward: true };
  if (!upToDate) {
    return protection;
  }
  return {
    ...protection,
    requiredStatusChecks: {
      checks: [{ context: "up-to-date", integrationId: GITHUB_ACTIONS_APP_ID }],
      strictRequiredStatusChecksPolicy: true,
    },
  };
};

const github: Effect.Effect<CompiledStack, ConfigError> & Readonly<{ stackName: string }> = Stack(
  "masseater-dev-github",
  {
    providers: Layer.mergeAll(cloudflareProviders(), gitHubProviders(), settingsProvider),
    state: state(),
  },
  Effect.gen(function* stack() {
    const managed = yield* repositories;
    yield* pipe(
      managed,
      Effect.forEach((repository) =>
        Repository(`Repository${repository.id}`, {
          owner: OWNER,
          name: repository.name,
          ...policyOf(repository),
        }),
      ),
    );
    const active = pipe(
      managed,
      Arr.filter((repository) => !isArchiving(repository)),
    );
    yield* pipe(active, Effect.forEach(settingsOf));
    yield* pipe(
      active,
      Arr.filter((repository) => !repository.private),
      Effect.forEach((repository) =>
        hasUpToDateWorkflow(repository).pipe(
          Effect.flatMap((upToDate) =>
            Ruleset(`Ruleset${repository.id}`, {
              owner: OWNER,
              repository: repository.name,
              name: "protect default branch",
              conditions: { include: ["~DEFAULT_BRANCH"] },
              ...rulesOf(upToDate),
            }).pipe(adopt(true)),
          ),
        ),
      ),
    );
    return { repositories: managed.length };
  }),
);

export default github;
