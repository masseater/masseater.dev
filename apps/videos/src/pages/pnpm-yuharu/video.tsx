import type { Draw, Look, Shot } from "@masseater.dev/video-kit";
import {
  Backdrop,
  Caption,
  Character,
  Credits,
  ShotPicture,
  Rating,
  Sfx,
  imageOf,
} from "@masseater.dev/video-kit";
import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

const ZUNDAMON = [3, 1, 7, 5, 22, 38, 75, 76];

const POSES = {
  default: "zun-stand",
  opening: "zun-wave",
  speed: "zun-cheer",
  monorepo: "zun-game",
  rating: "zun-cheer",
  ending: "zun-wave",
};

const secondLine = (shot: Shot): number =>
  pipe(
    Arr.get(shot.lines, 1),
    Option.map(({ from }) => from),
    Option.getOrElse(() => 0),
  );

const WIDE = "w-[960px] rounded-3xl bg-white p-4 shadow-[0_12px_0_rgb(0_0_0/0.15)]";

const Visual = ({
  shot,
  name,
  size = "h-[600px] w-[760px]",
}: Readonly<{ shot: Shot; name: string; size?: string }>): ReactNode => (
  <div className="absolute inset-x-0 top-[250px] flex h-[640px] items-center justify-center">
    <ShotPicture className={size} name={name} shot={shot} />
  </div>
);

export const look: Partial<Look> = {
  backdrop: (timeline) => (
    <>
      <Backdrop src={imageOf("bookshelf")(timeline)} tone="blur" />
      <Character
        className="inset-x-0 bottom-[-950px] h-[1750px]"
        poses={POSES}
        timeline={timeline}
        voices={ZUNDAMON}
      />
    </>
  ),
  overlay: () => "",
  frame: (shot, content) => (
    <>
      {content}
      <div className="absolute inset-x-[40px] top-[930px] flex justify-center">
        <Caption
          className="caption-outline text-[86px] whitespace-pre-line [--emphasis-outline:#ffffff] [--emphasis:#e8202a] [--outline:#24452a] [--stroke:0.24em]"
          shot={shot}
        />
      </div>
      <div className="absolute bottom-[300px] left-[40px] h-[130px] w-[130px] rounded-2xl bg-white p-3">
        <ShotPicture className="size-full" name="pnpm" shot={shot} />
      </div>
    </>
  ),
};

export const draw: Readonly<Record<string, Draw>> = {
  opening: (shot) => (
    <>
      <Visual name="pnpm" shot={shot} />
      <Sfx at={0} kind="hook" shot={shot} />
    </>
  ),
  origin: (shot) => <Visual name="programmer" shot={shot} />,
  speed: (shot) => (
    <>
      <Visual name="bench-clean" shot={shot} size={WIDE} />
      <Sfx at={secondLine(shot)} kind="pop" shot={shot} />
    </>
  ),
  disk: (shot) => <Visual name="pnpm-store" shot={shot} size={WIDE} />,
  monorepo: (shot) => <Visual name="bookshelf" shot={shot} />,
  complaint: (shot) => <Visual name="headache" shot={shot} />,
  rating: () => (
    <div className="absolute inset-x-0 top-[380px] flex scale-150 justify-center">
      <Rating at={[6, 10, 14, 18, 22, 30]} score={4} />
    </div>
  ),
  ending: (shot) => (
    <>
      <Visual name="guts" shot={shot} />
      <Sfx at={0} kind="ending" shot={shot} />
      <div className="absolute inset-x-0 bottom-[40px]">
        <Credits shot={shot} />
      </div>
    </>
  ),
};
