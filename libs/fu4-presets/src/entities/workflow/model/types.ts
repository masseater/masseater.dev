import type { Position } from "@r_masseater/fu4";

import type { Text } from "#/shared/yaml/index.ts";

export interface Bool extends Position {
  readonly value: boolean;
  readonly expression?: Text;
}

export interface Int {
  readonly value: number;
  readonly expression?: Text;
}

export interface Float {
  readonly value: number;
  readonly expression?: Text;
}

export interface EventFilter {
  readonly name: Text;
  readonly values: readonly Text[];
}

export interface WebhookEvent extends Position {
  readonly type: "webhook";
  readonly hook: Text;
  readonly types: readonly Text[];
  readonly branches?: EventFilter;
  readonly branchesIgnore?: EventFilter;
  readonly tags?: EventFilter;
  readonly tagsIgnore?: EventFilter;
  readonly paths?: EventFilter;
  readonly pathsIgnore?: EventFilter;
  readonly workflows: readonly Text[];
}

export interface ScheduleEntry {
  readonly cron: Text;
  readonly timezone?: Text;
}

export interface ScheduleEvent {
  readonly type: "schedule";
  readonly schedules: readonly ScheduleEntry[];
}

export type DispatchInputType = "none" | "string" | "number" | "boolean" | "choice" | "environment";

export interface DispatchInput {
  readonly name: Text;
  readonly description?: Text;
  readonly required?: Bool;
  readonly default?: Text;
  readonly kind: DispatchInputType;
  readonly options: readonly Text[];
}

export interface WorkflowDispatchEvent extends Position {
  readonly type: "workflow_dispatch";
  readonly inputs: Readonly<Record<string, DispatchInput>>;
}

export interface RepositoryDispatchEvent {
  readonly type: "repository_dispatch";
  readonly types: readonly Text[];
}

export type CallInputType = "invalid" | "boolean" | "number" | "string";

export interface CallEventInput {
  readonly id: string;
  readonly name: Text;
  readonly description?: Text;
  readonly default?: Text;
  readonly required?: Bool;
  readonly kind: CallInputType;
}

export interface CallEventSecret {
  readonly name: Text;
  readonly description?: Text;
  readonly required?: Bool;
}

export interface CallEventOutput {
  readonly name: Text;
  readonly description?: Text;
  readonly value?: Text;
}

export interface WorkflowCallEvent extends Position {
  readonly type: "workflow_call";
  readonly inputs: readonly CallEventInput[];
  readonly secrets?: Readonly<Record<string, CallEventSecret>>;
  readonly outputs: Readonly<Record<string, CallEventOutput>>;
}

export interface ImageVersionEvent {
  readonly type: "image_version";
  readonly names: readonly Text[];
  readonly versions: readonly Text[];
}

export type Event =
  | WebhookEvent
  | ScheduleEvent
  | WorkflowDispatchEvent
  | RepositoryDispatchEvent
  | WorkflowCallEvent
  | ImageVersionEvent;

export interface PermissionScope {
  readonly name: Text;
  readonly value: Text;
}

export interface Permissions {
  readonly all?: Text;
  readonly scopes: Readonly<Record<string, PermissionScope>>;
}

export interface DefaultsRun {
  readonly shell?: Text;
  readonly workingDirectory?: Text;
}

export interface Defaults {
  readonly run?: DefaultsRun;
}

export interface Concurrency {
  readonly group?: Text;
  readonly cancelInProgress?: Bool;
}

export interface Environment {
  readonly name?: Text;
  readonly url?: Text;
  readonly deployment?: Bool;
}
