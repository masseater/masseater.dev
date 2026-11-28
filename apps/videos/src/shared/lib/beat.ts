import { BGM_BEAT } from "#/shared/config/index.ts";

const SECONDS_PER_MINUTE = 60;

export const VIDEO_START = 0;

export const onBeat = (beat: number): number =>
  BGM_BEAT.first + (beat * SECONDS_PER_MINUTE) / BGM_BEAT.bpm;
