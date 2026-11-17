export { definePlugin, defineRule } from "#/entities/rule/index.ts";
export { format } from "./format.ts";
export { lint } from "./lint.ts";
export type { LintInput } from "./lint.ts";
export { wismPathspecs, wismSection } from "./section.ts";
export { WismError } from "#/shared/lib/errors.ts";
export type {
  Diagnostic,
  GraphEdge,
  ImportTarget,
  Plugin,
  Report,
  Rule,
  RuleContext,
  RuleEntry,
  RuleOptions,
  Severity,
  WismConfig,
} from "#/shared/config/index.ts";
