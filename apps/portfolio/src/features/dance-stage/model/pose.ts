import { queryOptions } from "@tanstack/react-query";
import { Effect } from "effect";

type PoseTrack = Readonly<{
  fps: number;
  width: number;
  height: number;
  frames: readonly (readonly (readonly number[])[])[];
}>;

const poseQuery = queryOptions({
  queryKey: ["seikin-techniques", "pose"],
  queryFn: (): Promise<PoseTrack> =>
    Effect.runPromise(
      Effect.promise(() => import("./generated/pose.json")).pipe(
        Effect.map(({ default: track }): PoseTrack => track),
      ),
    ),
  staleTime: Number.POSITIVE_INFINITY,
});

const FPS = 30;

const emptyTrack: PoseTrack = { fps: FPS, width: 0, height: 0, frames: [] };

export type { PoseTrack };
export { emptyTrack, poseQuery };
