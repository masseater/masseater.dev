import { fileURLToPath } from "node:url";

import { Record as Rec, pipe } from "effect";
import type { UserConfig } from "vite-plus";
import type { OxlintOverride } from "vite-plus/lint";

import type { WorkspaceSettings } from "#/features/build-workspace-settings/index.ts";
import type { MarkdownOptions } from "#/features/define-lint-preset/index.ts";
import {
  decisionTestRules,
  generated,
  lint as preset,
  markdownOf,
  requiredStack,
  structureOf,
} from "#/features/define-lint-preset/index.ts";

import { tasksOf } from "./repository-tasks.ts";
import { betterleaksOf, textlintOf } from "./repository-text.ts";
import type { SecretOptions, TextOptions } from "./repository-text.ts";

export interface RepositoryOptions {
  readonly workspace: WorkspaceSettings;
  readonly overrides?: readonly OxlintOverride[];
  readonly secrets?: SecretOptions;
  readonly textlint?: TextOptions;
  readonly markdown?: MarkdownOptions;
  readonly run?: { readonly tasks?: Readonly<Record<string, string>> };
}

const COMMIT_CONVENTION = fileURLToPath(import.meta.resolve("@commitlint/config-conventional"));

const lintOf = ({
  workspace,
  overrides = [],
}: RepositoryOptions): NonNullable<UserConfig["lint"]> => ({
  ...preset,
  ignorePatterns: [...generated, ...workspace.lint.ignorePatterns],
  overrides: [
    ...preset.overrides,
    {
      files: [...workspace.lint.shadcnUi],
      rules: { "react/jsx-props-no-spreading": "off" },
    },
    {
      files: [...workspace.lint.publicEntries, ...workspace.lint.deployEntries],
      rules: { "import/no-default-export": "off" },
    },
    ...overrides,
    ...workspace.lint.overrides,
    { files: ["**/*.test.ts"], rules: decisionTestRules },
  ],
});

export const repositoryConfig = (options: RepositoryOptions): UserConfig => {
  const { workspace, secrets = {}, textlint = {}, markdown = {}, run = {} } = options;
  return {
    commitlint: { extends: [COMMIT_CONVENTION] },
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
    betterleaks: betterleaksOf(secrets),
    wism: structureOf({
      members: workspace.members,
      ignorePatterns: workspace.lint.ignorePatterns,
    }),
    textlint: textlintOf(textlint),
    y8: markdownOf(markdown),
    test: { projects: [...workspace.testProjects], passWithNoTests: true },
    staged: { "*": "vp fmt --no-error-on-unmatched-pattern" },
    fmt: {
      ignorePatterns: [...generated, ...workspace.lint.ignorePatterns],
      sortImports: true,
      sortTailwindcss: true,
      sortPackageJson: true,
    },
    lint: lintOf(options),
    run: { cache: true, tasks: tasksOf({ workspace, commands: run.tasks ?? {} }) },
  };
};
