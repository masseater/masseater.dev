import type { Option } from "effect";

import type { Expr } from "#/entities/expression/model/ast.ts";
import type { ExprType } from "#/entities/expression/model/types.ts";

export interface TypeEnv {
  readonly vars: Readonly<Record<string, ExprType>>;
  readonly contexts: readonly string[];
  readonly special: readonly string[];
  readonly configVars: Option.Option<readonly string[]>;
}

export interface Scope {
  readonly env: TypeEnv;
  readonly fail: (expr: Expr, message: string) => void;
  readonly check: (expr: Expr) => ExprType;
}

export const CONFIG_NAME = "the fu4 section of vite.config.ts";
export const AVAILABILITY_DOCS =
  "see https://docs.github.com/en/actions/learn-github-actions/contexts#context-availability for more details";
