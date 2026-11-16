export { definePlugin, defineRule } from "#/entities/rule/index.ts";
export { format } from "./format.ts";
export { lint } from "./lint.ts";
export type { LintInput } from "./lint.ts";
export { MdlintError } from "#/shared/lib/errors.ts";
export type {
  Diagnostic,
  MarkdownNode,
  MarkdownlintRule,
  MdlintConfig,
  Plugin,
  Position,
  Report,
  Rule,
  RuleContext,
  RuleEntry,
  RuleOptions,
  Severity,
  Visitors,
} from "#/shared/config/index.ts";
