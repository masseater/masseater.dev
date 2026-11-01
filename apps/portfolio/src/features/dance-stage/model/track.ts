import { queryOptions } from "@tanstack/react-query";
import { Effect } from "effect";

type DanceTrack = Readonly<{
  fps: number;
  width: number;
  height: number;
  frames: readonly (readonly (readonly number[])[])[];
  audio: readonly (readonly number[])[];
  beats: readonly number[];
}>;

const trackQuery = queryOptions({
  queryKey: ["seikin-techniques", "track"],
  queryFn: (): Promise<DanceTrack> =>
    Effect.runPromise(
      Effect.promise(() => import("./generated/track.json")).pipe(
        Effect.map(({ default: track }): DanceTrack => track),
      ),
    ),
  staleTime: Number.POSITIVE_INFINITY,
});

const FPS = 30;

const emptyTrack: DanceTrack = {
  fps: FPS,
  width: 0,
  height: 0,
  frames: [],
  audio: [],
  beats: [],
};

export type { DanceTrack };
export { emptyTrack, trackQuery };
