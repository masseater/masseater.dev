import type { Option } from "effect";

import type { ContextExpr } from "#/entities/expression-tree/index.ts";
import type { Document } from "#/shared/yamlpath/index.ts";

import type { EnvValue, If, LoE, Uses } from "./common.ts";
import type { SymbolicLocation } from "./finding.ts";
import type { ActionInput, AuditInput, NormalJob } from "./input.ts";

export type Capability = "arbitrary" | "structured" | "fixed";

export type StepBodyCommon =
  | {
      readonly type: "uses";
      readonly uses: Uses;
      readonly with: LoE<ReadonlyMap<string, EnvValue>>;
    }
  | { readonly type: "run"; readonly run: string };

export interface Expansion {
  readonly path: string;
  readonly value: string;
  readonly location: SymbolicLocation;
}

export interface MatrixView {
  readonly location: SymbolicLocation;
  readonly expansions: readonly Expansion[];
  readonly indirectlyExpanded: Option.Option<SymbolicLocation>;
  readonly indirectInclusions: Option.Option<SymbolicLocation>;
}

export interface StepView {
  readonly kind: "workflow" | "composite";
  readonly input: AuditInput;
  readonly document: Document;
  readonly order: readonly number[];
  readonly name: Option.Option<string>;
  readonly id: Option.Option<string>;
  readonly if: Option.Option<If>;
  readonly env: LoE<ReadonlyMap<string, EnvValue>>;
  readonly body: StepBodyCommon;
  readonly location: SymbolicLocation;
  readonly locationWithGrip: SymbolicLocation;
  readonly matrix: Option.Option<MatrixView>;
  readonly envIsStatic: (context: ContextExpr) => boolean;
  readonly shell: () => Option.Option<readonly [string, SymbolicLocation]>;
  readonly getInput: (name: string) => Option.Option<Capability>;
  readonly job: Option.Option<NormalJob>;
  readonly action: Option.Option<ActionInput>;
  readonly index: number;
}
