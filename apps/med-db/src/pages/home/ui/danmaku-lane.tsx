import { Array, Option, pipe } from "effect";
import type { ReactNode } from "react";

import type { Comment } from "#/pages/home/lib/danmaku.ts";
import { useDanmakuPlayback } from "#/pages/home/model/danmaku-playback.ts";

import { DanmakuComments } from "./danmaku-comments.tsx";

const SPEEDS: readonly string[] = [
  "motion-safe:animate-danmaku",
  "motion-safe:animate-danmaku-fast",
  "motion-safe:animate-danmaku-slow",
];

const PLAY_STATE = { playing: "", paused: "animation-paused" } as const;

const COPIES = ["first", "second"] as const;

const speedOf = (lane: number): string =>
  Option.getOrElse(Array.get(SPEEDS, lane % SPEEDS.length), () => "motion-safe:animate-danmaku");

export const DanmakuLane = ({
  comments,
  lane,
}: Readonly<{ comments: readonly Comment[]; lane: number }>): ReactNode => {
  const playback = useDanmakuPlayback();
  return (
    <div className={`flex w-max ${speedOf(lane)} ${PLAY_STATE[playback]}`}>
      {pipe(
        COPIES,
        Array.map((copy) => <DanmakuComments key={copy} comments={comments} />),
      )}
    </div>
  );
};
