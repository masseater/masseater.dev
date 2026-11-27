import type { Option } from "effect";

import type { Format, SfxKind } from "#/shared/config/index.ts";

import type { Narration } from "./narration.ts";
import type { Line, Scene } from "./script.ts";

export interface TimedLine {
  readonly line: Line;
  readonly from: number;
  readonly duration: number;
  readonly audio: Option.Option<string>;
  readonly emphasisAt: Option.Option<number>;
}
export interface Cue {
  readonly at: number;
  readonly kind: SfxKind;
}

export interface TimedScene {
  readonly scene: Scene;
  readonly from: number;
  readonly duration: number;
  readonly lines: readonly TimedLine[];
  readonly reveals: readonly number[];
}

export interface Timeline {
  readonly format: Format;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly durationInFrames: number;
  readonly scenes: readonly TimedScene[];
  readonly bgm: Option.Option<string>;
  readonly cues: readonly Cue[];
  readonly sfx: Readonly<Record<SfxKind, string>>;
  readonly credits: readonly string[];
}

export interface Sources {
  readonly narration: Narration;
  readonly narrationSrc: (key: string) => string;
  readonly assetSrc: (url: string) => string;
  readonly speakerName: Option.Option<string>;
}
