import { Array, Option, pipe } from "effect";
import type { ReactNode } from "react";

import type { Comment } from "#/pages/home/lib/danmaku";

import { DanmakuComments } from "./danmaku-comments";

const SPEEDS: readonly string[] = [
  "animate-danmaku",
  "animate-danmaku-fast",
  "animate-danmaku-slow",
];

const COPIES = ["first", "second"] as const;

const speedOf = (lane: number): string =>
  Option.getOrElse(Array.get(SPEEDS, lane % SPEEDS.length), () => "animate-danmaku");

const DanmakuLane = ({
  comments,
  lane,
}: Readonly<{ comments: readonly Comment[]; lane: number }>): ReactNode => (
  <div className={`flex w-max motion-reduce:animate-none ${speedOf(lane)}`}>
    {pipe(
      COPIES,
      Array.map((copy) => <DanmakuComments key={copy} comments={comments} />),
    )}
  </div>
);

export { DanmakuLane };
