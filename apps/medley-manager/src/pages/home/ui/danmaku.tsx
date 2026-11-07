import { useSuspenseQuery } from "@tanstack/react-query";
import { Array, pipe } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { songsQuery } from "#/pages/home/api/loader";
import { danmakuLanes } from "#/pages/home/lib/danmaku";

import { DanmakuLane } from "./danmaku-lane";

const Danmaku = (): ReactNode => {
  const { data: songs } = useSuspenseQuery(songsQuery);
  const lanes = useMemo(
    () =>
      danmakuLanes(
        pipe(
          songs,
          Array.map((song) => song.title),
        ),
      ),
    [songs],
  );
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex flex-col justify-around overflow-hidden py-6 opacity-80"
    >
      {pipe(
        lanes,
        Array.map((lane, index) => (
          <DanmakuLane key={lane.key} comments={lane.comments} lane={index} />
        )),
      )}
    </div>
  );
};

export { Danmaku };
