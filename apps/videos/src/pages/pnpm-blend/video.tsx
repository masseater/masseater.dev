import type { Draw, Look, Shot } from "@masseater.dev/video-kit";
import { Caption, Picture, Sfx, Terminal, imageOf } from "@masseater.dev/video-kit";
import { FPS } from "@masseater.dev/video-kit/script";
import type { SfxKind } from "@masseater.dev/video-kit/script";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";
import type { ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";

import { tachiePath } from "#/shared/config/index.ts";
import { pick } from "#/shared/lib/pick.ts";

import { INTRO_STEPS } from "./script.ts";

const BOLD =
  "caption-outline text-[72px] font-bold whitespace-pre-line [--outline:#1b1b1b] [--stroke:0.14em]";
const RED_LOOK =
  "caption-outline leading-none tracking-[-0.06em] scale-x-[0.86] [--fill:#ff1e1e] [--outline:#2a0000] [--stroke:0.16em] [--emphasis:#ff1e1e] drop-shadow-[0_10px_0_rgb(0_0_0/0.8)]";
const RED = `text-[260px] ${RED_LOOK}`;

const CAPTION: Readonly<Record<string, string>> = { punch: RED, intro: "hidden" };
const CAPTION_TOP: Readonly<Record<string, string>> = { punch: "top-[620px]" };

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
  <div className="absolute inset-x-0 top-[440px] flex justify-center px-6 [&>div]:scale-[1.1]">
    <Terminal at={at} rows={rows} />
  </div>
);

const PANEL_ZOOM = 1.03;

const FOCUS: Readonly<Record<string, string>> = {
  "pnpm-home": "50% 11.7%",
  "pnpm-bench": "50% 69.5%",
  "pnpm-bench2": "50% 55.9%",
  "pnpm-motivation": "50% 40.6%",
};

const Panel = ({ shot, name }: Readonly<{ shot: Shot; name: string }>): ReactNode => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, shot.duration], [1, PANEL_ZOOM]);
  return (
    <div className="absolute inset-x-0 top-[440px] h-[640px] overflow-hidden bg-white">
      <Img
        className="size-full object-cover"
        src={imageOf(name)(shot)}
        style={{ objectPosition: pick(FOCUS, name, "50% 0%"), scale: String(scale) }}
      />
    </div>
  );
};

const Board = (): ReactNode => (
  <AbsoluteFill className="bg-[#285a41]">
    <div className="absolute inset-x-0 top-[64px] h-[18px] bg-[#9a5a33]" />
    <div className="absolute inset-x-0 top-0 bottom-[28px] overflow-hidden">
      <Img
        className="absolute top-[1052px] left-[300px] w-[920px] max-w-none"
        src={staticFile(tachiePath("tsumugi"))}
      />
    </div>
    <div className="absolute inset-x-0 bottom-0 h-[28px] bg-[#9a5a33]" />
    <div className="absolute bottom-[28px] left-[120px] h-[22px] w-[150px] bg-[#f1efe9]" />
  </AbsoluteFill>
);

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

const HIT_FRAMES = 5;

const POP_FROM = 1.35;
const STEP_SFX: Readonly<Record<string, SfxKind>> = { "3": "stamp" };
const sfxOf = (step: number): SfxKind =>
  Option.getOrElse(Rec.get(STEP_SFX, String(step)), (): SfxKind => "pop");
const POP_EASING = Easing.out(Easing.poly(3));

const stepFrames = pipe(
  INTRO_STEPS,
  Arr.map((seconds) => Math.round(seconds * FPS)),
);

const Pop = ({ step, children }: Readonly<{ step: number; children: ReactNode }>): ReactNode => {
  const frame = useCurrentFrame();
  return pipe(
    Arr.get(stepFrames, step),
    Option.filter((at) => frame >= at),
    Option.map((at) => (
      <div
        key={step}
        style={{
          scale: String(
            interpolate(frame, [at, at + HIT_FRAMES], [POP_FROM, 1], {
              easing: POP_EASING,
              extrapolateRight: "clamp",
            }),
          ),
        }}
      >
        {children}
      </div>
    )),
    Option.getOrNull,
  );
};

const Intro = ({ shot }: Readonly<{ shot: Shot }>): ReactNode => (
  <>
    <AbsoluteFill className="items-center justify-start gap-10 pt-[170px]">
      <Pop step={0}>
        <div className="caption-outline font-jp text-[74px] font-black whitespace-nowrap [--outline:#111] [--stroke:0.18em]">
          次世代のパッケージマネージャ
        </div>
      </Pop>
      <Pop step={1}>
        <div className="flex items-center gap-8">
          <Picture
            className="size-[230px] rounded-[50px] bg-white p-9"
            src={imageOf("pnpm")(shot)}
          />
          <div className="caption-plain font-sans text-[260px] leading-none font-semibold italic">
            pnpm
          </div>
        </div>
      </Pop>
      <Pop step={2}>
        <div className="font-jp flex items-baseline text-[#ffd400]">
          <span className="text-[440px] leading-none font-black tracking-[-0.08em]">30</span>
          <span className="text-[170px] font-black">秒で</span>
        </div>
      </Pop>
      <Pop step={3}>
        <div className="caption-outline font-jp text-[170px] font-black [--outline:#111] [--stroke:0.16em]">
          つむぎが解説
        </div>
      </Pop>
    </AbsoluteFill>
    {pipe(
      stepFrames,
      Arr.map((from, index) => <Sfx at={from} key={from} kind={sfxOf(index)} shot={shot} />),
    )}
  </>
);

export const look: Partial<Look> = {
  backdrop: () => <Board />,
  overlay: () => "",
  frame: (shot, content) => (
    <>
      {content}
      <div
        className={`absolute inset-x-[50px] flex justify-center ${pick(CAPTION_TOP, shot.id, "top-[150px] h-[270px] items-end")}`}
      >
        <Caption className={pick(CAPTION, shot.id, BOLD)} shot={shot} />
      </div>
      <Source />
    </>
  ),
};

export const draw: Readonly<Record<string, Draw>> = {
  intro: (shot) => <Intro shot={shot} />,
  hook: (shot) => (
    <>
      <Panel name="pnpm-home" shot={shot} />
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
      <Panel name="pnpm-bench2" shot={shot} />
      <LightLeak />
    </>
  ),
  disk: (shot) => <Panel name="pnpm-motivation" shot={shot} />,
  caveat: (shot) => <Panel name="pnpm-bench" shot={shot} />,
  ending: (shot) => (
    <>
      <Panel name="pnpm-home" shot={shot} />
      <LightLeak />
      <Sfx at={0} kind="ending" shot={shot} />
      <div className="font-jp absolute top-[1100px] left-[40px] text-[26px] leading-[1.5] font-bold text-white/45">
        {pipe(
          shot.credits,
          Arr.map((credit) => <p key={credit}>{credit}</p>),
        )}
      </div>
    </>
  ),
};
