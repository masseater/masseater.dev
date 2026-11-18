import type { YamlNode } from "@r_masseater/fu4";
import type { Option } from "effect";

import type { CacheMode, DockerUses, EnvValue, If, LoE, Permissions, Uses } from "./common.ts";

export type DispatchInputType = "boolean" | "choice" | "environment" | "number" | "string";

export type CallInputType = Exclude<DispatchInputType, "choice" | "environment">;

export interface WorkflowCallEvent {
  readonly inputs: ReadonlyMap<string, CallInputType>;
  readonly outputs: ReadonlyMap<string, string>;
  readonly secrets: readonly string[];
}

export interface WorkflowDispatchEvent {
  readonly inputs: ReadonlyMap<string, DispatchInputType>;
}

export type EventBody =
  | { readonly type: "default" }
  | { readonly type: "body"; readonly node: YamlNode; readonly types: readonly string[] };

export type TriggerSyntax =
  | { readonly type: "scalar" }
  | { readonly type: "sequence"; readonly events: readonly string[] }
  | { readonly type: "mapping" };

export interface Trigger {
  readonly events: ReadonlyMap<string, EventBody>;
  readonly syntax: TriggerSyntax;
  readonly workflowCall: Option.Option<WorkflowCallEvent>;
  readonly workflowDispatch: Option.Option<WorkflowDispatchEvent>;
}

export interface RunDefaults {
  readonly shell: Option.Option<LoE<string>>;
  readonly workingDirectory: Option.Option<string>;
}

export interface Defaults {
  readonly run: Option.Option<RunDefaults>;
}

export type Concurrency =
  | { readonly type: "bare"; readonly group: string }
  | { readonly type: "rich"; readonly group: string; readonly cancelInProgress: LoE<boolean> };

export type RunsOn =
  | { readonly type: "target"; readonly labels: readonly string[] }
  | {
      readonly type: "group";
      readonly group: Option.Option<string>;
      readonly labels: readonly string[];
    };

export type DeploymentEnvironment =
  | { readonly type: "name"; readonly name: string }
  | { readonly type: "name-url"; readonly name: string; readonly url: Option.Option<string> };

export interface SharedStepFields {
  readonly id: Option.Option<string>;
  readonly if: Option.Option<If>;
  readonly name: Option.Option<string>;
  readonly env: LoE<ReadonlyMap<string, EnvValue>>;
}

export type StepBody =
  | {
      readonly type: "uses";
      readonly uses: Uses;
      readonly with: LoE<ReadonlyMap<string, EnvValue>>;
    }
  | {
      readonly type: "run";
      readonly run: string;
      readonly workingDirectory: Option.Option<string>;
      readonly shell: Option.Option<LoE<string>>;
    };

export interface StepModel extends SharedStepFields {
  readonly body: StepBody;
}

export type RawStep =
  | { readonly type: "step"; readonly step: StepModel }
  | { readonly type: "parallel"; readonly steps: readonly StepModel[] }
  | { readonly type: "control" };

export type MatrixValue =
  | { readonly kind: "null" }
  | { readonly kind: "scalar"; readonly text: string }
  | { readonly kind: "array"; readonly items: readonly MatrixValue[] }
  | { readonly kind: "object"; readonly entries: readonly (readonly [string, MatrixValue])[] };

export type MatrixRow = readonly (readonly [string, MatrixValue])[];

export interface Matrix {
  readonly include: LoE<readonly MatrixRow[]>;
  readonly exclude: LoE<readonly MatrixRow[]>;
  readonly dimensions: LoE<readonly (readonly [string, LoE<readonly MatrixValue[]>])[]>;
}

export interface Strategy {
  readonly matrix: Option.Option<LoE<Matrix>>;
}

export interface DockerCredentials {
  readonly username: Option.Option<string>;
  readonly password: Option.Option<string>;
}

export type Container =
  | { readonly type: "name"; readonly image: LoE<DockerUses> }
  | {
      readonly type: "container";
      readonly image: LoE<DockerUses>;
      readonly credentials: Option.Option<DockerCredentials>;
      readonly env: LoE<ReadonlyMap<string, EnvValue>>;
    };

export interface NormalJobModel {
  readonly type: "normal";
  readonly name: Option.Option<string>;
  readonly cacheMode: Option.Option<CacheMode>;
  readonly permissions: Permissions;
  readonly needs: readonly string[];
  readonly if: Option.Option<If>;
  readonly runsOn: LoE<RunsOn>;
  readonly environment: Option.Option<DeploymentEnvironment>;
  readonly concurrency: Option.Option<Concurrency>;
  readonly env: LoE<ReadonlyMap<string, EnvValue>>;
  readonly defaults: Option.Option<Defaults>;
  readonly steps: readonly RawStep[];
  readonly strategy: Option.Option<Strategy>;
  readonly container: Option.Option<Container>;
  readonly services: readonly (readonly [string, Container])[];
}

export type Secrets =
  | { readonly type: "inherit" }
  | { readonly type: "env"; readonly env: ReadonlyMap<string, EnvValue> };

export interface ReusableJobModel {
  readonly type: "reusable";
  readonly name: Option.Option<string>;
  readonly cacheMode: Option.Option<CacheMode>;
  readonly permissions: Permissions;
  readonly needs: readonly string[];
  readonly if: Option.Option<If>;
  readonly uses: Uses;
  readonly with: LoE<ReadonlyMap<string, EnvValue>>;
  readonly secrets: Option.Option<Secrets>;
}

export type JobModel = NormalJobModel | ReusableJobModel;

export interface WorkflowModel {
  readonly name: Option.Option<string>;
  readonly runName: Option.Option<string>;
  readonly on: Trigger;
  readonly cacheMode: Option.Option<CacheMode>;
  readonly permissions: Permissions;
  readonly env: LoE<ReadonlyMap<string, EnvValue>>;
  readonly defaults: Option.Option<Defaults>;
  readonly concurrency: Option.Option<Concurrency>;
  readonly jobs: readonly (readonly [string, JobModel])[];
}

export type { EnvValue } from "./common.ts";
