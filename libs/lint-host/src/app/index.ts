export { flattenLayers, reportedSeverity, settingOf } from "#/entities/rule/index.ts";
export type {
  Flattened,
  LayeredConfig,
  RuleEntry,
  RuleOptions,
  Setting,
  Severity,
} from "#/entities/rule/index.ts";
export { buildAddon } from "#/features/build-addon/index.ts";
export type { AddonBuild } from "#/features/build-addon/index.ts";
export { callAddon, loadAddon } from "#/features/load-addon/index.ts";
export type { AddonCall, AddonSource, Telemetered } from "#/features/load-addon/index.ts";
export type { FailWith } from "#/shared/lib/fail.ts";
export { runCli, runTool } from "#/features/run-cli/index.ts";
export type {
  Cli,
  LintCall,
  PathspecRequest,
  Reported,
  SectionSource,
  Tool,
  ToolCall,
} from "#/features/run-cli/index.ts";
export { present } from "#/shared/lib/present.ts";
export { sortByPosition, traceparent } from "#/shared/lib/trace.ts";
export type { Positioned } from "#/shared/lib/trace.ts";
