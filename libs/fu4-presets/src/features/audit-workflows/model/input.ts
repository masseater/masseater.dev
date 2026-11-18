import type { Source } from "@r_masseater/fu4";
import type { Option } from "effect";

import type { Document } from "#/shared/yamlpath/index.ts";

import type { ActionModel } from "./action.ts";
import type { DependabotModel } from "./dependabot.ts";
import type { PreCommitConfigModel, PreCommitHooksModel } from "./pre-commit.ts";
import type { NormalJobModel, ReusableJobModel, StepModel, WorkflowModel } from "./workflow.ts";

export interface InputBase {
  readonly filename: string;
  readonly path: string;
  readonly source: Source;
  readonly document: Document;
}

export interface WorkflowInput extends InputBase {
  readonly kind: "workflow";
  readonly model: WorkflowModel;
}

export interface ActionInput extends InputBase {
  readonly kind: "action";
  readonly model: ActionModel;
}

export interface DependabotInput extends InputBase {
  readonly kind: "dependabot";
  readonly model: DependabotModel;
}

export interface PreCommitConfigInput extends InputBase {
  readonly kind: "pre-commit-config";
  readonly model: PreCommitConfigModel;
}

export interface PreCommitHooksInput extends InputBase {
  readonly kind: "pre-commit-hooks";
  readonly model: PreCommitHooksModel;
}

export type AuditInput =
  | WorkflowInput
  | ActionInput
  | DependabotInput
  | PreCommitConfigInput
  | PreCommitHooksInput;

export interface NormalJob {
  readonly id: string;
  readonly model: NormalJobModel;
  readonly workflow: WorkflowInput;
}

export interface ReusableJob {
  readonly id: string;
  readonly model: ReusableJobModel;
  readonly workflow: WorkflowInput;
}

export type Job =
  | { readonly type: "normal"; readonly job: NormalJob }
  | { readonly type: "reusable"; readonly job: ReusableJob };

export interface Step {
  readonly index: number;
  readonly parallelIndex: Option.Option<number>;
  readonly model: StepModel;
  readonly job: NormalJob;
}
