export interface Origin {
  readonly start: number;
  readonly end: number;
  readonly raw: string;
}

export type Literal =
  | { readonly kind: "number"; readonly value: number }
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "boolean"; readonly value: boolean }
  | { readonly kind: "null" };

export type BinaryOp = "and" | "or" | "eq" | "neq" | "gt" | "ge" | "lt" | "le";

export type FunctionName =
  | "contains"
  | "startswith"
  | "endswith"
  | "format"
  | "join"
  | "tojson"
  | "fromjson"
  | "hashfiles"
  | "case"
  | "success"
  | "always"
  | "cancelled"
  | "failure";

export type Expr =
  | { readonly type: "literal"; readonly literal: Literal }
  | { readonly type: "star" }
  | { readonly type: "call"; readonly func: FunctionName; readonly args: readonly Spanned[] }
  | { readonly type: "identifier"; readonly name: string }
  | { readonly type: "index"; readonly inner: Spanned }
  | { readonly type: "context"; readonly parts: readonly Spanned[] }
  | {
      readonly type: "binary";
      readonly lhs: Spanned;
      readonly op: BinaryOp;
      readonly rhs: Spanned;
    }
  | { readonly type: "not"; readonly inner: Spanned };

export interface Spanned {
  readonly origin: Origin;
  readonly expr: Expr;
}

export type ContextExpr = Extract<Expr, { readonly type: "context" }>;

export type Evaluation =
  | { readonly type: "string"; readonly value: string }
  | { readonly type: "number"; readonly value: number }
  | { readonly type: "boolean"; readonly value: boolean }
  | { readonly type: "null" }
  | { readonly type: "array"; readonly items: readonly Evaluation[] }
  | { readonly type: "object"; readonly entries: ReadonlyMap<string, Evaluation> };
