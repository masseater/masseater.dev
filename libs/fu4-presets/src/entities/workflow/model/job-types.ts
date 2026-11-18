import type { Position } from "@r_masseater/fu4";

import type {
  Bool,
  Concurrency,
  Defaults,
  Environment,
  Event,
  Float,
  Int,
  Permissions,
} from "#/entities/workflow/model/types.ts";
import type { Text } from "#/shared/yaml/index.ts";

export interface ExecRun {
  readonly type: "run";
  readonly run?: Text;
  readonly shell?: Text;
  readonly workingDirectory?: Text;
  readonly runPosition?: Position;
}

export interface Input {
  readonly name: Text;
  readonly value: Text;
}

export interface ExecAction {
  readonly type: "action";
  readonly uses?: Text;
  readonly inputs?: Readonly<Record<string, Input>>;
  readonly entrypoint?: Text;
  readonly args?: Text;
}

export type Exec = ExecAction | ExecRun;

export type RawValue =
  | (Position & { readonly type: "object"; readonly props: Readonly<Record<string, RawValue>> })
  | (Position & { readonly type: "array"; readonly elems: readonly RawValue[] })
  | (Position & { readonly type: "string"; readonly value: string });

export interface MatrixRow {
  readonly name?: Text;
  readonly values: readonly RawValue[];
  readonly expression?: Text;
}

export interface MatrixAssign {
  readonly key: Text;
  readonly value: RawValue;
}

export interface MatrixCombination {
  readonly assigns: Readonly<Record<string, MatrixAssign>>;
  readonly expression?: Text;
}

export interface MatrixCombinations {
  readonly combinations: readonly MatrixCombination[];
  readonly expression?: Text;
}

export interface Matrix extends Position {
  readonly rows: Readonly<Record<string, MatrixRow>>;
  readonly include?: MatrixCombinations;
  readonly exclude?: MatrixCombinations;
  readonly expression?: Text;
}

export interface Strategy {
  readonly matrix?: Matrix;
  readonly failFast?: Bool;
  readonly maxParallel?: Int;
}

export interface EnvVar {
  readonly name: Text;
  readonly value: Text;
}

export interface Env {
  readonly vars: Readonly<Record<string, EnvVar>>;
  readonly expression?: Text;
}

export interface Step {
  readonly id?: Text;
  readonly condition?: Text;
  readonly name?: Text;
  readonly exec?: Exec;
  readonly env?: Env;
  readonly continueOnError?: Bool;
  readonly timeoutMinutes?: Float;
}

export interface Credentials {
  readonly username?: Text;
  readonly password?: Text;
  readonly expression?: Text;
}

export interface Container {
  readonly image?: Text;
  readonly credentials?: Credentials;
  readonly env?: Env;
  readonly ports: readonly Text[];
  readonly volumes: readonly Text[];
  readonly options?: Text;
}

export interface Service {
  readonly name: Text;
  readonly container: Container;
}

export interface Services {
  readonly value: Readonly<Record<string, Service>>;
  readonly expression?: Text;
}

export interface Runner {
  readonly labels: readonly Text[];
  readonly labelsExpression?: Text;
  readonly group?: Text;
}

export interface CallValue {
  readonly name: Text;
  readonly value: Text;
}

export interface WorkflowCall {
  readonly uses?: Text;
  readonly inputs: Readonly<Record<string, CallValue>>;
  readonly secrets: Readonly<Record<string, CallValue>>;
  readonly inheritSecrets: boolean;
}

export interface Snapshot {
  readonly imageName?: Text;
  readonly version?: Text;
  readonly condition?: Text;
}

export interface Job extends Position {
  readonly id: Text;
  readonly name?: Text;
  readonly needs: readonly Text[];
  readonly runsOn?: Runner;
  readonly permissions?: Permissions;
  readonly environment?: Environment;
  readonly concurrency?: Concurrency;
  readonly outputs: Readonly<Record<string, Text>>;
  readonly env?: Env;
  readonly defaults?: Defaults;
  readonly condition?: Text;
  readonly steps?: readonly Step[];
  readonly timeoutMinutes?: Float;
  readonly strategy?: Strategy;
  readonly continueOnError?: Bool;
  readonly container?: Container;
  readonly services?: Services;
  readonly workflowCall?: WorkflowCall;
  readonly snapshot?: Snapshot;
}

export interface Workflow {
  readonly name?: Text;
  readonly runName?: Text;
  readonly on?: readonly Event[];
  readonly permissions?: Permissions;
  readonly env?: Env;
  readonly defaults?: Defaults;
  readonly concurrency?: Concurrency;
  readonly jobs?: Readonly<Record<string, Job>>;
}
