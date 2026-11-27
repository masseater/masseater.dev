import type { Draw, Look, Timeline } from "@masseater.dev/video-kit";
import { Backdrop, Caption, Character, Credits, Sfx, imageOf } from "@masseater.dev/video-kit";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";
import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

const TSUMUGI = [8];
const METAN = [2, 0, 6, 4, 36, 37];

const ZOOM: Readonly<Record<string, string>> = {
  guess: "scale-[1.45] origin-[22%_45%]",
  punch: "scale-[1.6] origin-[22%_45%]",
};

const SPEAKER: Readonly<Record<string, string>> = {
  8: "left-[40px] top-[520px] [--outline:#d99a00]",
  2: "right-[40px] top-[480px] [--outline:#8a3fb8]",
};

const zoomOf = (timeline: Timeline, frame: number): string =>
  pipe(
    timeline.cuts,
    Arr.findLast(({ from }) => frame >= from),
    Option.flatMap(({ id }) => Rec.get(ZOOM, id)),
    Option.getOrElse(() => ""),
  );

const Stage = ({ timeline }: Readonly<{ timeline: Timeline }>): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill className={zoomOf(timeline, frame)}>
      <Backdrop src={imageOf("classroom")(timeline)} />
      <Character
        className="bottom-[-400px] left-[-190px] h-[1700px] w-[850px]"
        timeline={timeline}
        voices={TSUMUGI}
      />
      <Character
        className="right-[-280px] bottom-[-380px] h-[1700px] w-[1020px]"
        timeline={timeline}
        voices={METAN}
      />
    </AbsoluteFill>
  );
};

export const look: Partial<Look> = {
  backdrop: (timeline) => <Stage timeline={timeline} />,
  overlay: () => (
    <div className="font-jp caption-plain absolute inset-x-0 top-[170px] text-center text-[76px] font-black tracking-[0.2em]">
      pnpm
    </div>
  ),
  frame: (shot, content) => (
    <>
      {content}
      <div
        className={`absolute max-w-[560px] ${Option.getOrElse(Rec.get(SPEAKER, String(shot.voice)), () => "")}`}
      >
        <Caption className="caption-outline text-[54px] [--stroke:0.22em]" shot={shot} />
      </div>
    </>
  ),
};

export const draw: Readonly<Record<string, Draw>> = {
  ask: (shot) => <Sfx at={0} kind="hook" shot={shot} />,
  typo: () => <span />,
  deny: (shot) => <Sfx at={0} kind="pop" shot={shot} />,
  quiz: () => <span />,
  guess: () => <span />,
  answer: () => <span />,
  punch: (shot) => (
    <>
      <Sfx at={0} kind="ending" shot={shot} />
      <div className="absolute inset-x-0 bottom-[10px]">
        <Credits shot={shot} />
      </div>
    </>
  ),
};
