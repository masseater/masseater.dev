import type { Project } from "@r_masseater/fu4";

import type { ScriptParser } from "#/features/zizmor/lib/script.ts";

import type { Config } from "./config.ts";
import type { FindingDraft } from "./finding.ts";
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
  readonly online: boolean;
  readonly project: Project;
  readonly parseScript: ScriptParser;
}

export type Drafts = readonly FindingDraft[];

export interface RepoView {
  readonly index: number;
  readonly model: RepoModel;
  readonly input: PreCommitConfigInput;
}

export interface Audit {
  readonly ident: string;
  readonly desc: string;
  readonly workflow?: (workflow: WorkflowInput, context: AuditContext) => Drafts;
  readonly normalJob?: (job: NormalJob, context: AuditContext) => Drafts;
  readonly reusableJob?: (job: ReusableJob, context: AuditContext) => Drafts;
  readonly step?: (step: StepView, context: AuditContext) => Drafts;
  readonly action?: (action: ActionInput, context: AuditContext) => Drafts;
  readonly dockerAction?: (action: ActionInput, context: AuditContext) => Drafts;
  readonly compositeStep?: (step: StepView, context: AuditContext) => Drafts;
  readonly dependabot?: (dependabot: DependabotInput, context: AuditContext) => Drafts;
  readonly preCommitConfig?: (config: PreCommitConfigInput, context: AuditContext) => Drafts;
  readonly preCommitRepo?: (repo: RepoView, context: AuditContext) => Drafts;
  readonly preCommitHooks?: (hooks: PreCommitHooksInput, context: AuditContext) => Drafts;
  readonly raw?: (input: AuditInput, context: AuditContext) => Drafts;
}
