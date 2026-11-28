import type { Draw, Look, Shot, Timeline } from "@masseater.dev/video-kit";
import { Caption, Picture, PsdNarrator, Sfx, Terminal, imageOf } from "@masseater.dev/video-kit";
import { FPS } from "@masseater.dev/video-kit/script";
import type { SfxKind } from "@masseater.dev/video-kit/script";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";
import type { ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";

import { tachiePath, tachiePsdPath } from "#/shared/config/index.ts";
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

const TACHIE = "tsumugi3";
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

const PARTS = [
  { kind: "blink", closed: "v1.!目/*閉じ", open: "v1.!目/*基本目セット" },
  {
    kind: "volume-mouth",
    closed: "v1.!口/*ほほえみ",
    half: "v1.!口/*お",
    open: "v1.!口/*わあ",
  },
] as const;

const Board = ({ timeline }: Readonly<{ timeline: Timeline }>): ReactNode => (
  <AbsoluteFill className="bg-[#285a41]">
    <div className="absolute inset-x-0 top-[64px] h-[18px] bg-[#9a5a33]" />
    <div className="absolute inset-x-0 top-0 bottom-[28px] overflow-hidden">
      <PsdNarrator
        className="top-[1340px] left-[366px] h-[1682px] w-[1000px]"
        parts={PARTS}
        psd={staticFile(tachiePsdPath(TACHIE))}
        timeline={timeline}
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
        className="absolute top-[-470px] left-[-1050px] w-[3246px] max-w-none rotate-[-6deg]"
        src={staticFile(tachiePath(TACHIE))}
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

const AREA = "absolute inset-x-[50px] top-[450px] h-[760px]";
const CHALK = "#f4f1e8";
const YELLOW = "#ffd400";
const ALARM = "#ff6b5b";
const GROW_FRAMES = 14;
const GROW = Easing.out(Easing.poly(3));
const NOTHING = 0;
const FULL = 1;

const grow = (frame: number, from: number): number =>
  interpolate(frame, [from, from + GROW_FRAMES], [NOTHING, FULL], {
    easing: GROW,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const lineStart = (shot: Shot, index: number): number =>
  pipe(
    Arr.get(shot.lines, index),
    Option.map(({ from }) => from),
    Option.getOrElse(() => NOTHING),
  );

const NPM_SECONDS = 43.1;
const ONE_DECIMAL = 1;

const SlowInstall = ({ shot }: Readonly<{ shot: Shot }>): ReactNode => {
  const frame = useCurrentFrame();
  const elapsed = interpolate(frame, [NOTHING, shot.duration], [NOTHING, NPM_SECONDS], {
    extrapolateRight: "clamp",
  });
  const filled = interpolate(frame, [NOTHING, shot.duration], [0.04, 0.22]);
  return (
    <div className={`${AREA} font-jp flex flex-col justify-center gap-10`}>
      <div className="font-code text-[76px] text-white/90">$ npm install</div>
      <div className="h-[120px] w-full rounded-[10px] border-[6px] border-white/85 p-[8px]">
        <div
          className="h-full rounded-[4px] bg-[#ff6b5b]"
          style={{ width: `${String(filled * 100)}%` }}
        />
      </div>
      <div className="flex items-baseline justify-end gap-4 text-white">
        <span className="text-[202px] leading-none font-black tabular-nums">
          {elapsed.toFixed(ONE_DECIMAL)}
        </span>
        <span className="text-[86px] font-black">秒…</span>
      </div>
      <div className="text-right text-[38px] text-white/55">
        初回インストール（pnpm.io/benchmarks）
      </div>
    </div>
  );
};

interface Bar {
  readonly label: string;
  readonly seconds: number;
  readonly color: string;
}

const AGAIN: readonly Bar[] = [
  { label: "1回目", seconds: 4.6, color: CHALK },
  { label: "2回目", seconds: 0.2, color: YELLOW },
];

const LONGEST = 4.6;
const BAR_GAP = 8;

const TwiceBars = (): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <div className={`${AREA} font-jp flex flex-col justify-center gap-16`}>
      {pipe(
        AGAIN,
        Arr.map((bar, index) => (
          <div className="flex flex-col gap-4" key={bar.label}>
            <div className="flex items-baseline justify-between text-white">
              <span className="text-[81px] font-black">{bar.label}</span>
              <span className="text-[148px] leading-none font-black" style={{ color: bar.color }}>
                {bar.seconds}
                <span className="text-[76px]">秒</span>
              </span>
            </div>
            <div className="h-[130px] w-full">
              <div
                className="h-full min-w-[18px] rounded-[8px]"
                style={{
                  background: bar.color,
                  width: `${String((bar.seconds / LONGEST) * 100 * grow(frame, index * BAR_GAP))}%`,
                }}
              />
            </div>
          </div>
        )),
      )}
    </div>
  );
};

const PROJECTS = ["A", "B", "C"] as const;
const FLAT = ["react", "vite", "esbuild", "rollup", "typescript"] as const;
const TRANSITIVE = new Set<string>(["esbuild", "rollup"]);
const PACKAGES = pipe(
  FLAT,
  Arr.filter((name) => !TRANSITIVE.has(name)),
);
const STAGGER = 4;

const Store = (): ReactNode => {
  const frame = useCurrentFrame();
  const linked = grow(frame, GROW_FRAMES);
  return (
    <div className={`${AREA} font-jp text-white`}>
      <div className="flex justify-between">
        {pipe(
          PROJECTS,
          Arr.map((name, index) => (
            <div
              className="flex w-[300px] flex-col items-center rounded-[14px] border-[5px] border-white/85 py-4 font-black"
              key={name}
              style={{ translate: `0 ${String((FULL - grow(frame, index * STAGGER)) * 40)}px` }}
            >
              <span className="text-[40px] whitespace-nowrap text-white/75">プロジェクト</span>
              <span className="text-[96px] leading-none">{name}</span>
            </div>
          )),
        )}
      </div>
      <svg className="h-[200px] w-full" viewBox="0 0 980 170">
        {pipe(
          [150, 490, 830],
          Arr.map((x) => (
            <line
              key={x}
              stroke={YELLOW}
              strokeDasharray="14 12"
              strokeLinecap="round"
              strokeWidth="8"
              x1={x}
              x2={490 + (x - 490) * 0.35}
              y1={10}
              y2={10 + 150 * linked}
            />
          )),
        )}
      </svg>
      <div className="mx-auto flex w-[900px] flex-col items-center gap-5 rounded-[18px] border-[6px] border-[#ffd400] px-8 py-7">
        <div className="text-[65px] font-black text-[#ffd400]">PCに1つだけ</div>
        <div className="flex gap-5">
          {pipe(
            PACKAGES,
            Arr.map((name) => (
              <div
                className="font-code rounded-[10px] bg-white px-5 py-2 text-[51px] text-[#1b1b1b]"
                key={name}
              >
                {name}
              </div>
            )),
          )}
        </div>
      </div>
    </div>
  );
};

interface Usage {
  readonly label: string;
  readonly copies: number;
  readonly color: string;
}

const USAGE: readonly Usage[] = [
  { label: "npm", copies: 3, color: ALARM },
  { label: "pnpm", copies: 1, color: YELLOW },
];

const COPY_WIDTH = 30;

const Disk = (): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <div className={`${AREA} font-jp flex flex-col justify-center gap-14 text-white`}>
      <div className="text-[59px] font-black text-white/80">プロジェクト3つ分の容量</div>
      {pipe(
        USAGE,
        Arr.map((usage, row) => (
          <div className="flex items-center gap-6" key={usage.label}>
            <span className="font-code w-[230px] text-[76px] font-bold">{usage.label}</span>
            <div className="flex h-[140px] flex-1 gap-[6px]">
              {pipe(
                Arr.range(1, usage.copies),
                Arr.map((copy) => (
                  <div
                    className="h-full rounded-[6px]"
                    key={copy}
                    style={{
                      background: usage.color,
                      width: `${String(COPY_WIDTH * grow(frame, (row + copy) * STAGGER))}%`,
                    }}
                  />
                )),
              )}
            </div>
          </div>
        )),
      )}
    </div>
  );
};

const DiskFrom = ({ at }: Readonly<{ at: number }>): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <div style={{ opacity: grow(frame, at) }}>
      <Disk />
    </div>
  );
};

const Sharing = ({ shot }: Readonly<{ shot: Shot }>): ReactNode => {
  const frame = useCurrentFrame();
  const second = lineStart(shot, 1);
  if (second > NOTHING && frame >= second) {
    return <DiskFrom at={second} />;
  }
  return <Store />;
};

const MISSING = "esbuild";

const ROW_LOOK = {
  away: {
    border: "3px dashed rgb(255 255 255 / 0.35)",
    background: "transparent",
    color: "rgb(255 255 255 / 0.35)",
  },
  here: { border: "3px solid transparent", background: "rgb(255 255 255 / 0.9)", color: "#1b1b1b" },
} as const;

const MARK = {
  found: { text: "○", color: "#1f9d55" },
  lost: { text: "✕", color: ALARM },
} as const;

const markOf = (hidden: boolean): (typeof MARK)[keyof typeof MARK] => {
  if (hidden) {
    return MARK.lost;
  }
  return MARK.found;
};

const rowLookOf = (away: boolean): (typeof ROW_LOOK)[keyof typeof ROW_LOOK] => {
  if (away) {
    return ROW_LOOK.away;
  }
  return ROW_LOOK.here;
};

const Mark = ({ hidden, frame }: Readonly<{ hidden: boolean; frame: number }>): ReactNode => {
  const mark = markOf(hidden);
  return (
    <span
      className="text-[54px] font-black"
      style={{ color: mark.color, opacity: grow(frame, GROW_FRAMES) }}
    >
      {mark.text}
    </span>
  );
};

const Modules = ({
  title,
  hidden,
  frame,
}: Readonly<{ title: string; hidden: boolean; frame: number }>): ReactNode => (
  <div className="flex w-[475px] flex-col gap-3 rounded-[14px] border-[5px] border-white/85 p-6">
    <div className="font-code text-[54px] font-bold text-white">{title}</div>
    <div className="font-code text-[40px] text-white/60">node_modules/</div>
    {pipe(
      FLAT,
      Arr.map((name) => (
        <div
          className="font-code flex items-center justify-between rounded-[8px] px-4 py-1 text-[46px]"
          key={name}
          style={rowLookOf(hidden && TRANSITIVE.has(name))}
        >
          <span>{name}</span>
          {pipe(
            Option.liftPredicate(name, (each) => each === MISSING),
            Option.map(() => <Mark frame={frame} hidden={hidden} key="mark" />),
            Option.getOrNull,
          )}
        </div>
      )),
    )}
  </div>
);

const OldTool = (): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <div className={`${AREA} font-jp flex flex-col items-center gap-6`}>
      <div className="rounded-full bg-white px-8 py-2 text-[51px] font-black text-[#1b1b1b]">
        古いツール「esbuild どこ？」
      </div>
      <div className="flex w-full justify-between">
        <Modules frame={frame} hidden={false} title="npm" />
        <Modules frame={frame} hidden title="pnpm" />
      </div>
    </div>
  );
};

export const look: Partial<Look> = {
  backdrop: (timeline) => <Board timeline={timeline} />,
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
      <SlowInstall shot={shot} />
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
  again: () => (
    <>
      <TwiceBars />
      <LightLeak />
    </>
  ),
  disk: (shot) => <Sharing shot={shot} />,
  caveat: () => <OldTool />,
  ending: (shot) => (
    <>
      <Panel name="pnpm-home" shot={shot} />
      <LightLeak />
      <Sfx at={0} kind="ending" shot={shot} />
    </>
  ),
};
