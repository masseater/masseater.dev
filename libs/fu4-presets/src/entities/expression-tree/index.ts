export { asBoolean } from "./lib/evaluation.ts";
export { consteval } from "./lib/consteval.ts";
export { asPattern, childOf, matchesPattern, singleTail } from "./lib/context.ts";
export { parseExpression } from "./lib/parser.ts";
export {
  commutativeMatches,
  computedIndices,
  constevalSubexprs,
  contexts,
  dataflowContexts,
  leafExpressions,
} from "./lib/walk.ts";
export type * from "./model/types.ts";
