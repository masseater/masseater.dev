import type { Position } from "@r_masseater/fu4";
import type { Option } from "effect";

import type { ExprType, ObjectType } from "#/entities/expression/index.ts";
import type { Fail } from "#/features/actionlint/lib/workflow-rule.ts";

export interface Vars {
  readonly matrix: Option.Option<ObjectType>;
  readonly steps: Option.Option<ObjectType>;
  readonly needs: Option.Option<ObjectType>;
  readonly secrets: Option.Option<ObjectType>;
  readonly inputs: Option.Option<ObjectType>;
  readonly dispatchInputs: Option.Option<ObjectType>;
  readonly jobs: Option.Option<ObjectType>;
}

export interface ExprEnv {
  readonly fail: Fail;
  readonly configVars: Option.Option<readonly string[]>;
  readonly vars: () => Vars;
}

export interface Typed extends Position {
  readonly type: ExprType;
}
