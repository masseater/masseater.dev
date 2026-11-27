import { visualizeAudio } from "@remotion/media-utils";
import type { MediaUtilsAudioData } from "@remotion/media-utils";
import { Array as Arr, Number as Num, pipe } from "effect";

export interface Band {
  readonly audio: MediaUtilsAudioData;
  readonly fps: number;
  readonly lowCut: number;
  readonly highCut: number;
}

const SAMPLES = 1024;
const BINS_PER_WINDOW = 2;
const WINDOW = SAMPLES * BINS_PER_WINDOW;
const LEVEL_SCALE = 4000;
const FIRST_BIN = 1;
const LAST_BIN = SAMPLES - FIRST_BIN;
const SILENT = 0;

const cache = new Map<string, readonly number[]>();

const levelAt = (band: Band, frame: number): number => {
  const bins = visualizeAudio({
    audioData: band.audio,
    frame,
    fps: band.fps,
    numberOfSamples: SAMPLES,
    smoothing: false,
    optimizeFor: "speed",
  });
  const hertzPerBin = band.audio.sampleRate / WINDOW;
  const low = Math.max(FIRST_BIN, Math.floor(band.lowCut / hertzPerBin));
  const high = Math.min(LAST_BIN, Math.ceil(band.highCut / hertzPerBin));
  const picked = pipe(bins, Arr.take(high + FIRST_BIN), Arr.drop(low));
  if (Arr.isReadonlyArrayEmpty(picked)) {
    return SILENT;
  }
  return (Num.sumAll(picked) / picked.length) * LEVEL_SCALE;
};

const levelsOf = (band: Band): readonly number[] => {
  const frames = Math.ceil(band.audio.durationInSeconds * band.fps);
  const playable = pipe(
    band.audio.channelWaveforms,
    Arr.every((wave) => wave.length >= WINDOW),
  );
  if (!playable) {
    return Arr.makeBy(frames, () => SILENT);
  }
  return Arr.makeBy(frames, (frame) => levelAt(band, frame));
};

export const bandLevels = (band: Band): readonly number[] =>
  cache.getOrInsertComputed(
    `${band.audio.resultId}:${String(band.fps)}:${String(band.lowCut)}:${String(band.highCut)}`,
    () => levelsOf(band),
  );
