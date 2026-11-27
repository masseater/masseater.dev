import { Array as Arr, Option, pipe } from "effect";

import type { Shot, VideoScript } from "#/entities/cut/index.ts";
import { NOTHING } from "#/shared/config/index.ts";
import { Credits, Headline, Label, Points, Rating, Tags, Terminal } from "#/widgets/parts/index.ts";
import type { Draw } from "#/widgets/video/index.ts";

const SAMPLE_LENGTH = 30;
const ENDING_HOLD = 2;
const TAG_STEP = 8;
const POINT_STEP = 12;
const ROW_STEP = 10;
const STAR_STEP = 4;
const BEATS = 6;
const TITLE_DELAY = 3;
const SCORE = 4;

export const SAMPLE: VideoScript = {
  title: "見本",
  formats: ["vertical", "horizontal"],
  length: { vertical: SAMPLE_LENGTH },
  voice: NOTHING,
  readings: {},
  cuts: [
    { id: "opening", say: ["**見本ツール**を30秒で。"] },
    { id: "features", say: ["速くて、**軽い**。"] },
    { id: "usage", say: ["`sample run` で動く。"] },
    { id: "rating", say: ["おすすめ度は**星4つ**。"] },
    { id: "ending", say: [], hold: ENDING_HOLD },
  ],
};

const beatsOf = (shot: Shot, step: number): readonly number[] => {
  const first = pipe(
    Arr.head(shot.lines),
    Option.match({ onNone: () => NOTHING, onSome: ({ from }) => from }),
  );
  return Arr.makeBy(BEATS, (position) => first + position * step);
};

const TAGS = ["2026年〜", "見本社 発"] as const;
const POINTS = ["速い", "**軽い**", "`設定`いらず"] as const;
const ROWS = ["$ sample run", "Done in 1.2s"] as const;

export const SAMPLE_DRAW: Readonly<Record<string, Draw>> = {
  opening: (shot) => (
    <>
      <Headline shot={shot} slot="name" text="見本**ツール**" />
      <Tags at={beatsOf(shot, TAG_STEP)} items={TAGS} />
    </>
  ),
  features: (shot) => (
    <>
      <Headline shot={shot} text="特徴" />
      <Points at={beatsOf(shot, POINT_STEP)} items={POINTS} shot={shot} />
    </>
  ),
  usage: (shot) => (
    <>
      <Headline shot={shot} text="使い方" />
      <Terminal at={beatsOf(shot, ROW_STEP)} rows={ROWS} />
    </>
  ),
  rating: (shot) => (
    <>
      <Headline shot={shot} text="おすすめ度" />
      <Rating at={beatsOf(shot, STAR_STEP)} score={SCORE} />
    </>
  ),
  ending: (shot) => (
    <>
      <Label text="ひとことで言うと" />
      <Headline at={TITLE_DELAY} shot={shot} slot="title" text="迷ったら**これ**" />
      <Credits shot={shot} />
    </>
  ),
};
