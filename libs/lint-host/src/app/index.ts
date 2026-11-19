export { mergedRules, reportedSeverity, settingOf } from "#/entities/rule/index.ts";
export type { RuleEntry, RuleOptions, Setting, Severity } from "#/entities/rule/index.ts";
export { buildAddon } from "#/features/build-addon/index.ts";
export type { AddonBuild } from "#/features/build-addon/index.ts";
export { callAddon, exposes, loadAddon } from "#/features/load-addon/index.ts";
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
export { layersOf, mergedLayers, mergedRecords } from "#/shared/lib/layers.ts";
export type { Layer, Merged } from "#/shared/lib/layers.ts";
export { aligned, wordAt } from "#/shared/lib/words.ts";
