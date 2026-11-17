export { agnix, definePlugin, defineRule } from "#/entities/rule/index.ts";
export { diagnosticDetail, format } from "./format.ts";
export { lint } from "./lint.ts";
export {
  docsPlugin,
  docsPreset,
  recommendedMarkdownRules,
} from "#/features/check-documents/index.ts";
export type { DocsPresetOptions, SkillNameOptions } from "#/features/check-documents/index.ts";
export { markdownPathspecs, y8Section } from "./section.ts";
export type { PathspecInput } from "./section.ts";
export type { LintInput } from "./lint.ts";
export { Y8Error } from "#/shared/lib/errors.ts";
export type {
  Diagnostic,
  Frontmatter,
  Override,
  PackageManifest,
  MarkdownNode,
  MarkdownlintRule,
  Y8Config,
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
