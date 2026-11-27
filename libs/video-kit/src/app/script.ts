export { ScriptError, parseScript, plainOf, textOf } from "#/entities/script/index.ts";
export type { Bgm, Line, Scene, SceneKind, Script, Segment } from "#/entities/script/index.ts";
export { estimateSeconds, narrationKey, planTimeline, spokenOf } from "#/entities/script/index.ts";
export type {
  Narration,
  Sources,
  TimedLine,
  TimedScene,
  Timeline,
} from "#/entities/script/index.ts";
export { checkScript } from "#/features/check-script/index.ts";
export type { Issue } from "#/features/check-script/index.ts";
export { FIT, FONT, FORMATS, FPS, FRAMES, SFX, Timing } from "#/shared/config/index.ts";
export type { Format } from "#/shared/config/index.ts";
