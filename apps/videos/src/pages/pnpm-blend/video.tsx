import type { Draw, Look, Shot } from "@masseater.dev/video-kit";
import {
  Caption,
  Credits,
  Footage,
  Picture,
  Sfx,
  Terminal,
  imageOf,
} from "@masseater.dev/video-kit";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";
import type { ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";

import { tachiePath } from "#/shared/config/index.ts";

const BOLD =
  "caption-outline text-[68px] font-bold whitespace-pre-line [--outline:#111] [--stroke:0.2em]";
const RED =
  "caption-outline text-[260px] leading-none tracking-[-0.06em] scale-x-[0.86] [--fill:#ff1e1e] [--outline:#2a0000] [--stroke:0.16em] [--emphasis:#ff1e1e] drop-shadow-[0_10px_0_rgb(0_0_0/0.8)]";

const CAPTION: Readonly<Record<string, string>> = { punch: RED };
const CAPTION_TOP: Readonly<Record<string, string>> = { punch: "top-[620px]" };

const pick = (record: Readonly<Record<string, string>>, key: string, fallback: string): string =>
  Option.getOrElse(Rec.get(record, key), () => fallback);

const RUN = [
  "$ pnpm add react vite typescript",
  "Packages: +18",
  "++++++++++++++++++",
  "Done in 4.6s using pnpm v12.23.0",
];

const LOG = [
  ...RUN,
  "Packages are hard linked from the content-addressable store to the virtual store.",
  "  Content-addressable store is at: ~/.local/share/pnpm/store/v11",
  "Progress: resolved 18, reused 13, downloaded 11, added 18, done",
  "dependencies:",
  "+ react 19.3.1",
  "+ typescript 7.0.2",
  "+ vite 8.3.8",
  "$ rm -rf node_modules && pnpm install",
  "Done in 175ms using pnpm v12.23.0",
];

const SCROLL_PER_FRAME = 2.4;
const FLASH_FRAMES = 9;
const CUT_IN_FRAMES = 7;

const Console = ({
  rows,
  at,
}: Readonly<{ rows: readonly string[]; at: readonly number[] }>): ReactNode => (
  <AbsoluteFill className="items-center justify-start bg-[#15171b] px-8 pt-[300px] [&>div]:scale-[1.15]">
    <Terminal at={at} rows={rows} />
  </AbsoluteFill>
);

const Screen = ({ shot, name }: Readonly<{ shot: Shot; name: string }>): ReactNode => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, shot.duration], [1, 1.08]);
  return (
    <AbsoluteFill className="items-center justify-start bg-[#1b1d21] pt-[260px]">
      <Img
        className="absolute size-full scale-125 object-cover opacity-40 blur-3xl"
        src={imageOf(name)(shot)}
      />
      <Img
        className="w-full shadow-[0_30px_80px_rgb(0_0_0/0.6)]"
        src={imageOf(name)(shot)}
        style={{ scale: String(scale) }}
      />
    </AbsoluteFill>
  );
};

const LightLeak = (): ReactNode => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 2, FLASH_FRAMES], [0, 0.85, 0], {
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      className="bg-[radial-gradient(circle_at_85%_20%,#ffb347,#ff6a00_45%,transparent_75%)] mix-blend-screen"
      style={{ opacity }}
    />
  );
};

const Log = (): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill className="overflow-hidden bg-[#0b0d10]">
      <div
        className="font-code px-6 text-[34px] leading-[1.45] whitespace-pre text-[#8b949e] opacity-45"
        style={{ translate: `0 ${String(200 - frame * SCROLL_PER_FRAME)}px` }}
      >
        {pipe(
          [...LOG, ...LOG, ...LOG],
          Arr.map((row, index) => <div key={`${String(index)}:${row}`}>{row}</div>),
        )}
      </div>
    </AbsoluteFill>
  );
};

const CutIn = (): ReactNode => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, CUT_IN_FRAMES], [1.6, 1], {
    easing: Easing.out(Easing.back(1.4)),
    extrapolateRight: "clamp",
  });
  return (
    <div
      className="absolute inset-x-0 bottom-0 h-[1040px] origin-[70%_50%] overflow-hidden [mask-image:linear-gradient(transparent,black_22%)]"
      style={{ scale: String(zoom), opacity: interpolate(frame, [0, 2], [0, 1]) }}
    >
      <Img
        className="absolute top-[-1090px] left-[-2708px] w-[5296px] max-w-none rotate-[-6deg]"
        src={staticFile(tachiePath("tsumugi"))}
      />
    </div>
  );
};

const SOURCE = { name: "pnpm", url: "pnpm.io" } as const;

const Source = (): ReactNode => (
  <div className="absolute inset-x-0 top-0 flex h-[64px] items-center gap-4 bg-black px-8 font-sans text-[30px] text-white/80">
    <span className="font-bold text-white">{SOURCE.name}</span>
    <span>{SOURCE.url}</span>
  </div>
);

export const look: Partial<Look> = {
  backdrop: () => <AbsoluteFill className="bg-black" />,
  overlay: () => "",
  frame: (shot, content) => (
    <>
      {content}
      <div
        className={`absolute inset-x-[50px] flex justify-center ${pick(CAPTION_TOP, shot.id, "top-[1400px]")}`}
      >
        <Caption className={pick(CAPTION, shot.id, BOLD)} shot={shot} />
      </div>
      <Source />
    </>
  ),
};

export const draw: Readonly<Record<string, Draw>> = {
  hook: (shot) => (
    <>
      <Footage
        className="blur-[6px] brightness-[0.35]"
        shot={shot}
        src={imageOf("pnpm-home")(shot)}
      />
      <AbsoluteFill className="items-center justify-start gap-5 pt-[420px]">
        <Picture
          className="size-[200px] rounded-[44px] bg-white p-8 shadow-[0_12px_40px_rgb(0_0_0/0.45)]"
          src={imageOf("pnpm")(shot)}
        />
        <div className="caption-plain font-sans text-[170px] leading-none font-semibold italic">
          pnpm
        </div>
      </AbsoluteFill>
      <Sfx at={0} kind="hook" shot={shot} />
    </>
  ),
  try: () => <Console at={[0, 24, 36, 44]} rows={RUN} />,
  wow: (shot) => (
    <>
      <Console at={[0, 0, 0, 0]} rows={RUN} />
      <LightLeak />
      <Sfx at={0} kind="pop" shot={shot} />
    </>
  ),
  punch: (shot) => (
    <>
      <Log />
      <CutIn />
      <Sfx at={0} kind="stamp" shot={shot} />
    </>
  ),
  again: (shot) => (
    <>
      <Screen name="pnpm-bench2" shot={shot} />
      <LightLeak />
    </>
  ),
  disk: (shot) => <Footage shot={shot} src={imageOf("pnpm-motivation")(shot)} />,
  caveat: (shot) => <Screen name="pnpm-bench" shot={shot} />,
  ending: (shot) => (
    <>
      <Footage shot={shot} src={imageOf("pnpm-home")(shot)} />
      <LightLeak />
      <Sfx at={0} kind="ending" shot={shot} />
      <div className="absolute inset-x-0 bottom-[20px]">
        <Credits shot={shot} />
      </div>
    </>
  ),
};
