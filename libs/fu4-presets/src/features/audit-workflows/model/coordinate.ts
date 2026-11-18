import type { UsesPattern } from "#/features/audit-workflows/lib/uses.ts";
import type { Version } from "#/features/audit-workflows/lib/version.ts";

export type ControlOrigin =
  | { readonly type: "default"; readonly field: string }
  | { readonly type: "input"; readonly field: string }
  | { readonly type: "uses-ref" }
  | { readonly type: "with-expression" };

export type Verdict = "satisfied" | "not-satisfied" | "conditional";

export interface ControlEvaluation {
  readonly verdict: Verdict;
  readonly origins: readonly ControlOrigin[];
}

export type FieldType =
  | { readonly type: "boolean" }
  | { readonly type: "free-string" }
  | { readonly type: "exact"; readonly items: readonly string[] };

export type Toggle = "opt-in" | "opt-out";

export type ControlExpr =
  | { readonly type: "version-less-than"; readonly version: Version }
  | {
      readonly type: "field";
      readonly toggle: Toggle;
      readonly field: string;
      readonly fieldType: FieldType;
      readonly satisfiedByDefault: boolean;
    }
  | { readonly type: "all"; readonly exprs: readonly ControlExpr[] }
  | { readonly type: "any"; readonly exprs: readonly ControlExpr[] }
  | { readonly type: "not"; readonly expr: ControlExpr };

export type Coordinate =
  | { readonly type: "configurable"; readonly pattern: UsesPattern; readonly control: ControlExpr }
  | { readonly type: "fixed"; readonly pattern: UsesPattern };

export type Usage =
  | { readonly type: "enabled"; readonly origins: readonly ControlOrigin[] }
  | { readonly type: "conditional"; readonly origins: readonly ControlOrigin[] }
  | { readonly type: "always" };
