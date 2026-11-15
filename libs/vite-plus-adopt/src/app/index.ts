/** @internal */
export { loadViteConfig } from "#/entities/config/index.ts";
/** @internal */
export type {
  BetterleaksConfig,
  BetterleaksRule,
  CommitlintConfig,
  DependencyRules,
  FallowConfig,
  MarkdownlintConfig,
  SteigerConfig,
  SteigerSection,
  TextlintConfig,
  ToolSections,
} from "#/shared/config/index.ts";
/** @internal */
export { runVpa } from "./vpa.ts";
/** @internal */
export { VpToolsError } from "#/shared/lib/errors.ts";
