export { checkerOf } from "./lib/checker.ts";
export type { Checked, Checker, CheckerOptions } from "./lib/checker.ts";
export { isConstant } from "./lib/functions.ts";
export { parse } from "./lib/parser.ts";
export type { Parsed } from "./lib/parser.ts";
export { assignable } from "./model/assign.ts";
export { merge } from "./model/merge.ts";
export {
  ANY,
  BOOL,
  NULL,
  NUMBER,
  STRING,
  arrayOf,
  describe,
  loose,
  mapOf,
  strict,
} from "./model/types.ts";
export type { ArrayType, ExprType, ObjectType, Props } from "./model/types.ts";
