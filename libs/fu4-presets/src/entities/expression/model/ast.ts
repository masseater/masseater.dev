export type TokenKind =
  | "END"
  | "IDENT"
  | "STRING"
  | "INTEGER"
  | "FLOAT"
  | "("
  | ")"
  | "["
  | "]"
  | "."
  | "!"
  | "<"
  | "<="
  | ">"
  | ">="
  | "=="
  | "!="
  | "&&"
  | "||"
  | "*"
  | ",";

export interface Token {
  readonly kind: TokenKind;
  readonly value: string;
  readonly line: number;
  readonly column: number;
}

export interface ExprError {
  readonly message: string;
  readonly line: number;
  readonly column: number;
}

export type CompareOp = "<" | "<=" | ">" | ">=" | "==" | "!=";

export type LogicalOp = "&&" | "||";

export type Expr =
  | { readonly type: "variable"; readonly name: string; readonly token: Token }
  | { readonly type: "null"; readonly token: Token }
  | { readonly type: "bool"; readonly token: Token }
  | { readonly type: "int"; readonly token: Token }
  | { readonly type: "float"; readonly token: Token }
  | { readonly type: "string"; readonly value: string; readonly token: Token }
  | { readonly type: "object-deref"; readonly receiver: Expr; readonly property: string }
  | { readonly type: "array-deref"; readonly receiver: Expr }
  | { readonly type: "index"; readonly operand: Expr; readonly index: Expr }
  | { readonly type: "not"; readonly operand: Expr; readonly token: Token }
  | {
      readonly type: "compare";
      readonly op: CompareOp;
      readonly left: Expr;
      readonly right: Expr;
    }
  | {
      readonly type: "logical";
      readonly op: LogicalOp;
      readonly left: Expr;
      readonly right: Expr;
    }
  | {
      readonly type: "call";
      readonly callee: string;
      readonly args: readonly Expr[];
      readonly token: Token;
    };

export const tokenOf = (expr: Expr): Token => {
  if (expr.type === "object-deref" || expr.type === "array-deref") {
    return tokenOf(expr.receiver);
  }
  if (expr.type === "index") {
    return tokenOf(expr.operand);
  }
  if (expr.type === "compare" || expr.type === "logical") {
    return tokenOf(expr.left);
  }
  return expr.token;
};
