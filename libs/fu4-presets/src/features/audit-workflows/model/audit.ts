import type { Project } from "@r_masseater/fu4";
import type { Effect, Option } from "effect";

import type { ScriptParser } from "#/features/audit-workflows/lib/script.ts";

import type { Config } from "./config.ts";
import type { FindingDraft } from "./finding.ts";
import type { GitHubClient } from "./github.ts";
import type {
  ActionInput,
  AuditInput,
  DependabotInput,
  NormalJob,
  PreCommitConfigInput,
  PreCommitHooksInput,
  ReusableJob,
  WorkflowInput,
} from "./input.ts";
import type { RepoModel } from "./pre-commit.ts";
import type { StepView } from "./step.ts";

export interface AuditContext {
  readonly config: Config;
  readonly project: Project;
  readonly parseScript: ScriptParser;
  readonly github: Option.Option<GitHubClient>;
}

export type Drafts = readonly FindingDraft[];

export type Produced = Drafts | Effect.Effect<Drafts>;

export interface RepoView {
  readonly index: number;
  readonly model: RepoModel;
  readonly input: PreCommitConfigInput;
}

export interface Audit {
  readonly ident: string;
  readonly desc: string;
  readonly workflow?: (workflow: WorkflowInput, context: AuditContext) => Produced;
  readonly normalJob?: (job: NormalJob, context: AuditContext) => Produced;
  readonly reusableJob?: (job: ReusableJob, context: AuditContext) => Produced;
  readonly step?: (step: StepView, context: AuditContext) => Produced;
  readonly action?: (action: ActionInput, context: AuditContext) => Produced;
  readonly dockerAction?: (action: ActionInput, context: AuditContext) => Produced;
  readonly compositeStep?: (step: StepView, context: AuditContext) => Produced;
  readonly dependabot?: (dependabot: DependabotInput, context: AuditContext) => Produced;
  readonly preCommitConfig?: (config: PreCommitConfigInput, context: AuditContext) => Produced;
  readonly preCommitRepo?: (repo: RepoView, context: AuditContext) => Produced;
  readonly preCommitHooks?: (hooks: PreCommitHooksInput, context: AuditContext) => Produced;
  readonly raw?: (input: AuditInput, context: AuditContext) => Produced;
}
