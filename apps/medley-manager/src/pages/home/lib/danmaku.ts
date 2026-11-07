import { Array, Option, pipe } from "effect";

const COMMENT_COLORS: readonly string[] = [
  "text-foreground",
  "text-comment-yellow",
  "text-comment-pink",
  "text-comment-cyan",
  "text-foreground",
  "text-comment-green",
  "text-comment-orange",
  "text-comment-purple",
];

const LANE_COUNT = 4;
const SONGS_PER_LANE = 8;

type Comment = Readonly<{ key: string; text: string; color: string }>;

type Lane = Readonly<{ key: string; comments: readonly Comment[] }>;

const colorAt = (index: number): string =>
  Option.getOrElse(
    Array.get(COMMENT_COLORS, index % COMMENT_COLORS.length),
    () => "text-foreground",
  );

const laneComments = (songTitles: readonly string[], lane: number): readonly Comment[] =>
  pipe(
    songTitles,
    Array.drop(lane * SONGS_PER_LANE),
    Array.take(SONGS_PER_LANE),
    Array.map((text, index) => ({
      key: `${lane.toString()}-${index.toString()}`,
      text,
      color: colorAt(lane + index),
    })),
  );

const danmakuLanes = (songTitles: readonly string[]): readonly Lane[] =>
  Array.makeBy(LANE_COUNT, (lane) => ({
    key: `lane-${lane.toString()}`,
    comments: laneComments(songTitles, lane),
  }));

export type { Comment, Lane };
export { danmakuLanes };
