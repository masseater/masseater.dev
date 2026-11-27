import type { MediaUtilsAudioData } from "@remotion/media-utils";
import type { Option } from "effect";

import type { Phoneme } from "#/entities/phonemes/index.ts";

export interface Speech {
  readonly frame: number;
  readonly fps: number;
  readonly phonemes: readonly Phoneme[];
  readonly audio: Option.Option<MediaUtilsAudioData>;
}
