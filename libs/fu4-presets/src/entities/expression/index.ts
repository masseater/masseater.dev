export { checkerOf } from "./lib/checker.ts";
export type { Checker } from "./lib/checker.ts";
export { isConstant } from "./lib/functions.ts";
export { parse } from "./lib/parser.ts";
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
export type { ExprType, ObjectType } from "./model/types.ts";
