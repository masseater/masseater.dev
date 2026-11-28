import type { Part } from "@masseater.dev/tachie";
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
  "caption-outline text-[68px] font-bold whitespace-pre-line [--outline:#1b1b1b] [--stroke:0.14em]";
const RED_LOOK =
  "caption-outline leading-none tracking-[-0.06em] scale-x-[0.86] [--fill:#ff1e1e] [--outline:#2a0000] [--stroke:0.16em] [--emphasis:#ff1e1e] drop-shadow-[0_10px_0_rgb(0_0_0/0.8)]";
const RED = `text-[180px] ${RED_LOOK}`;

const CAPTION: Readonly<Record<string, string>> = { punch: RED, intro: "hidden" };
const VOICE_FILL: Readonly<Record<string, string>> = { "3": "[--fill:#c6f28a]" };
const CAPTION_TOP: Readonly<Record<string, string>> = { punch: "top-[620px]" };

const RUN = ["$ pnpm install", "++++++++++++++++", "Done in 4.0s"];
const AGAIN_RUN = ["$ rm -rf node_modules", "$ pnpm install", "Done in 0.4s"];

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
  "Done in 407ms using pnpm v12.23.0",
];

const SCROLL_PER_FRAME = 2.4;
const FLASH_FRAMES = 9;

const Console = ({
  rows,
  at,
}: Readonly<{ rows: readonly string[]; at: readonly number[] }>): ReactNode => (
  <div className="absolute inset-x-0 top-[300px] flex justify-center px-6 [&>div]:scale-[1.45]">
    <Terminal at={at} rows={rows} />
  </div>
);

interface Mouth {
  readonly half: string;
  readonly open: string;
}

interface Scene {
  readonly before: readonly Part[];
  readonly closed: string;
  readonly open?: string;
  readonly after: readonly Part[];
  readonly later: readonly Part[];
}

interface Cast {
  readonly voice: number;
  readonly psd: string;
  readonly className: string;
  readonly blink: Part;
  readonly mouth: Mouth;
  readonly idle: Scene;
  readonly scenes: Readonly<Record<string, Scene>>;
}

const HALF = 0.5;
const NONE: readonly Part[] = [];

const TSUMUGI: Cast = {
  voice: 8,
  psd: "tsumugi3",
  className: "top-[1010px] left-[330px] h-[1682px] w-[1000px]",
  blink: { kind: "blink", closed: "v1.!目/*閉じ", open: "v1.!目/*基本目セット" },
  mouth: { half: "v1.!口/*お", open: "v1.!口/*わあ" },
  idle: { before: NONE, closed: "v1.!口/*ほほえみ", after: NONE, later: NONE },
  scenes: {
    wait: { before: ["v1.!まゆ/*普通眉"], closed: "v1.!口/*む", after: NONE, later: NONE },
    hook: {
      before: ["v1.!まゆ/*ごきげん眉"],
      closed: "v1.!口/*むふ",
      after: NONE,
      later: ["v1.!目/*にっこり"],
    },
    try: {
      before: ["v1.!まゆ/*ごきげん眉", "v1.!目/*基本目セット/!黒目/*カメラ目線"],
      closed: "v1.!口/*むん",
      after: ["v1.!右腕/*ゆびさし"],
      later: NONE,
    },
    wow: {
      before: ["v1.!まゆ/*ごきげん眉", "v1.!目/*基本目セット/!黒目/*きらーん"],
      closed: "v1.!口/*にしー",
      after: NONE,
      later: NONE,
    },
    again: {
      before: ["v1.!まゆ/*ごきげん眉", "v1.!目/*基本目セット/!黒目/*きらーん"],
      closed: "v1.!口/*にしー",
      after: ["v1.!左腕/*ピース", "v1.顔色/ほっぺ赤め"],
      later: NONE,
    },
    caveat: { before: ["v1.!まゆ/*普通眉"], closed: "v1.!口/*む", after: NONE, later: NONE },
    fix: {
      before: ["v1.!まゆ/*ごきげん眉", "v1.!目/*基本目セット/!黒目/*カメラ目線"],
      closed: "v1.!口/*にしー",
      after: ["v1.!右腕/*ゆびさし"],
      later: NONE,
    },
    ending: {
      before: ["v1.!まゆ/*ごきげん眉"],
      closed: "v1.!口/*わあーい",
      after: NONE,
      later: ["v1.!目/*にっこり", "v1.!右腕/*ピース"],
    },
    join: {
      before: ["v1.!まゆ/*ごきげん眉", "v1.!目/*にっこり"],
      closed: "v1.!口/*わあーい",
      after: ["v1.!右腕/*ピース"],
      later: NONE,
    },
  },
};

const OUTFIT = "v1.*服装1/*いつもの服";
const ZUNDA_ARM = (side: "右" | "左", pose: string): string => `v1.*服装1/!${side}腕/*${pose}`;

const ZUNDAMON: Cast = {
  voice: 3,
  psd: "zundamon",
  className: "top-[960px] left-[-250px] h-[1600px] w-[1050px]",
  blink: { kind: "blink", closed: "v1.!目/*UU", open: "v1.!目/*目セット" },
  mouth: { half: "v1.!口/*ほあ", open: "v1.!口/*ほあー" },
  idle: { before: [OUTFIT, "v1.!眉/*普通眉"], closed: "v1.!口/*むー", after: NONE, later: NONE },
  scenes: {
    wait: {
      before: [OUTFIT, "v1.!眉/*困り眉1", "v1.!目/*目セット/!黒目/*目逸らし"],
      closed: "v1.!口/*むー",
      after: NONE,
      later: ["v1.記号など/汗1"],
    },
    hook: {
      before: [OUTFIT, "v1.!眉/*困り眉2", "v1.!目/*目セット/!黒目/*目逸らし2"],
      closed: "v1.!口/*むー",
      open: "v1.!口/*んあー",
      after: ["v1.記号など/汗2", "v1.!顔色/かげり", "v1.!枝豆/*枝豆萎え"],
      later: [ZUNDA_ARM("右", "苦しむ"), ZUNDA_ARM("左", "苦しむ")],
    },
    try: {
      before: [OUTFIT, "v1.!眉/*上がり眉", "v1.!目/*目セット/!黒目/*カメラ目線"],
      closed: "v1.!口/*ほー",
      after: NONE,
      later: NONE,
    },
    wow: {
      before: [OUTFIT, "v1.!眉/*上がり眉"],
      closed: "v1.!口/*ほあ",
      after: ["v1.!目/*〇〇", "v1.記号など/汗1"],
      later: [ZUNDA_ARM("右", "手を挙げる"), ZUNDA_ARM("左", "手を挙げる")],
    },
    again: {
      before: [OUTFIT, "v1.!眉/*上がり眉"],
      closed: "v1.!口/*ほあー",
      after: ["v1.!目/*〇〇", "v1.!顔色/*ほっぺ赤め"],
      later: NONE,
    },
    caveat: {
      before: [OUTFIT, "v1.!眉/*困り眉1", "v1.!目/*目セット/!黒目/*目逸らし"],
      closed: "v1.!口/*むー",
      after: ["v1.記号など/汗3", "v1.!枝豆/*枝豆萎え", ZUNDA_ARM("左", "考える")],
      later: NONE,
    },
    fix: {
      before: [OUTFIT, "v1.!眉/*上がり眉"],
      closed: "v1.!口/*ほあ",
      after: ["v1.!目/*〇〇"],
      later: NONE,
    },
    ending: {
      before: [OUTFIT, "v1.!眉/*普通眉", "v1.!目/*目セット/!黒目/*カメラ目線"],
      closed: "v1.!口/*むふ",
      after: NONE,
      later: NONE,
    },
    join: {
      before: [OUTFIT, "v1.!眉/*上がり眉"],
      closed: "v1.!口/*むふ",
      after: ["v1.!目/*にっこり", "v1.!顔色/*ほっぺ赤め", ZUNDA_ARM("右", "手を挙げる")],
      later: NONE,
    },
  },
};

const CAST = [ZUNDAMON, TSUMUGI] as const;

const partsOf = (cast: Cast, timeline: Timeline, frame: number): readonly Part[] =>
  pipe(
    timeline.cuts,
    Arr.findFirst(({ from, duration }) => frame >= from && frame < from + duration),
    Option.map((cut) => {
      const scene = Option.getOrElse(Option.fromNullishOr(cast.scenes[cut.id]), () => cast.idle);
      return [
        ...scene.before,
        cast.blink,
        {
          kind: "volume-mouth",
          closed: scene.closed,
          half: cast.mouth.half,
          open: scene.open ?? cast.mouth.open,
          alwaysApply: true,
        } as const,
        ...scene.after,
        ...pipe(
          scene.later,
          Arr.filter(() => frame >= cut.from + cut.duration * HALF),
        ),
      ];
    }),
    Option.getOrElse(() => [...cast.idle.before, cast.blink]),
  );

const Board = ({ timeline }: Readonly<{ timeline: Timeline }>): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill className="bg-[#285a41]">
      <div className="absolute inset-x-0 top-[64px] h-[18px] bg-[#9a5a33]" />
      <div className="absolute inset-x-0 top-0 bottom-[28px] overflow-hidden">
        {pipe(
          CAST,
          Arr.map((cast) => (
            <PsdNarrator
              className={cast.className}
              key={cast.psd}
              parts={partsOf(cast, timeline, frame)}
              psd={staticFile(tachiePsdPath(cast.psd))}
              timeline={timeline}
              voice={cast.voice}
            />
          )),
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[28px] bg-[#9a5a33]" />
      <div className="absolute bottom-[28px] left-[120px] h-[22px] w-[150px] bg-[#f1efe9]" />
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
        className="font-code px-6 text-[34px] leading-[1.45] whitespace-pre text-[#8b949e] opacity-20 blur-[2px]"
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

const CROUCH_FRAMES = 10;
const DASH_FRAMES = 10;
const TRAILS = [0, 1, 2, 3] as const;
const TRAIL_LAG = 1.6;
const STREAKS = [
  { top: 380, width: 520, speed: 150, offset: 0 },
  { top: 520, width: 760, speed: 190, offset: 300 },
  { top: 760, width: 440, speed: 170, offset: 620 },
  { top: 1180, width: 680, speed: 210, offset: 140 },
  { top: 1380, width: 560, speed: 160, offset: 820 },
  { top: 1560, width: 820, speed: 200, offset: 460 },
] as const;
const SCREEN = 1080;

const dashX = (frame: number): number =>
  interpolate(frame, [0, CROUCH_FRAMES, CROUCH_FRAMES + DASH_FRAMES], [-40, 0, 1500], {
    easing: Easing.in((time) => Easing.cubic(time)),
    extrapolateRight: "clamp",
  });

const Streak = ({
  streak,
  frame,
}: Readonly<{ streak: (typeof STREAKS)[number]; frame: number }>): ReactNode => {
  const travel = SCREEN + streak.width;
  const left = SCREEN - ((streak.offset + frame * streak.speed) % travel);
  return (
    <div
      className="absolute h-[10px] rounded-full bg-white/70"
      style={{
        top: streak.top,
        left,
        width: streak.width,
        opacity: interpolate(frame, [CROUCH_FRAMES - 2, CROUCH_FRAMES + 2], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    />
  );
};

const Dash = (): ReactNode => {
  const frame = useCurrentFrame();
  const squash = interpolate(frame, [0, CROUCH_FRAMES], [1, 0.92], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="overflow-hidden">
      {pipe(
        STREAKS,
        Arr.map((streak) => <Streak frame={frame} key={streak.top} streak={streak} />),
      )}
      {pipe(
        TRAILS,
        Arr.map((trail) => (
          <Img
            className="absolute top-[760px] left-[100px] w-[1000px] max-w-none origin-bottom rotate-[12deg]"
            key={trail}
            src={staticFile(tachiePath(TSUMUGI.psd))}
            style={{
              translate: `${String(dashX(frame - trail * TRAIL_LAG))}px 0`,
              scale: `1 ${String(squash)}`,
              opacity: (TRAILS.length - trail) / TRAILS.length / (trail + 1),
            }}
          />
        )),
      )}
    </AbsoluteFill>
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
    <AbsoluteFill className="items-center justify-start gap-6 pt-[250px]">
      <Pop step={0}>
        <div className="caption-outline font-jp text-[62px] font-black whitespace-nowrap [--outline:#111] [--stroke:0.18em]">
          次世代のパッケージマネージャ
        </div>
      </Pop>
      <Pop step={1}>
        <div className="flex items-center gap-8">
          <Picture
            className="size-[200px] rounded-[44px] bg-white p-8"
            src={imageOf("pnpm")(shot)}
          />
          <div className="caption-plain font-sans text-[220px] leading-none font-semibold italic">
            pnpm
          </div>
        </div>
      </Pop>
      <Pop step={2}>
        <div className="font-jp flex items-baseline text-[#ffd400]">
          <span className="text-[380px] leading-none font-black tracking-[-0.08em]">30</span>
          <span className="text-[150px] font-black">秒で</span>
        </div>
      </Pop>
      <Pop step={3}>
        <div className="caption-outline font-jp text-[116px] font-black [--outline:#111] [--stroke:0.16em]">
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

const AREA = "absolute inset-x-[80px] top-[250px] h-[600px]";
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
const COUNT_SHARE = 0.85;
const CRAWL_AT = [0, 0.25, 0.5, 0.62, 1] as const;
const WAIT_CRAWL = [0, 9.8, 21.4, 27.6, 31.9];
const HOOK_CRAWL = [31.9, 38.2, 41.7, 41.9, 43.1];
const CLOCK_TURN = 40;

const Clock = ({ frame }: Readonly<{ frame: number }>): ReactNode => (
  <svg className="size-[150px] shrink-0 text-white" viewBox="0 0 100 100">
    <circle cx="50" cy="50" fill="none" r="44" stroke="currentColor" strokeWidth="6" />
    <line
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="6"
      x1="50"
      x2="50"
      y1="50"
      y2="28"
    />
    <line
      stroke={ALARM}
      strokeLinecap="round"
      strokeWidth="5"
      transform={`rotate(${String(frame * CLOCK_TURN)} 50 50)`}
      x1="50"
      x2="50"
      y1="50"
      y2="14"
    />
  </svg>
);
const ONE_DECIMAL = 1;

interface Run {
  readonly command: string;
  readonly crawl: readonly number[];
  readonly total: number;
  readonly color: string;
  readonly step: number;
}

const NPM_RUN = { command: "$ npm install", total: NPM_SECONDS, color: ALARM, step: 8 } as const;
const PNPM_RUN: Run = {
  command: "$ pnpm install",
  crawl: [0, 0.9, 2.2, 3.4, 4],
  total: 4,
  color: YELLOW,
  step: 1,
};

const Install = ({ shot, run }: Readonly<{ shot: Shot; run: Run }>): ReactNode => {
  const frame = useCurrentFrame();
  const shown = Math.floor(frame / run.step) * run.step;
  const elapsed = interpolate(
    shown,
    pipe(
      CRAWL_AT,
      Arr.map((share) => shot.duration * COUNT_SHARE * share),
    ),
    run.crawl,
    { extrapolateRight: "clamp" },
  );
  const filled = elapsed / run.total;
  return (
    <div className={`${AREA} font-jp flex flex-col justify-center gap-10`}>
      <div className="font-code rounded-[16px] bg-[#0b0d10] px-8 py-5 text-[64px] text-white/90">
        {run.command}
      </div>
      <div className="h-[100px] w-full shrink-0 rounded-[10px] border-[6px] border-white/85 p-[8px]">
        <div
          className="h-full rounded-[4px]"
          style={{ width: `${String(filled * 100)}%`, background: run.color }}
        />
      </div>
      <div className="flex items-center justify-between gap-4 text-white">
        <Clock frame={shown} />
        <span
          className="ml-auto text-[180px] leading-none font-black tabular-nums"
          style={{ color: run.color }}
        >
          {elapsed.toFixed(ONE_DECIMAL)}
        </span>
        <span className="text-[86px] font-black">秒</span>
      </div>
      <div className="text-[36px] font-bold text-white/50">pnpm.io/benchmarks</div>
    </div>
  );
};

interface Bar {
  readonly label: string;
  readonly seconds: number;
  readonly color: string;
}

const RACE: readonly Bar[] = [
  { label: "npm", seconds: 43.1, color: ALARM },
  { label: "pnpm", seconds: 4, color: YELLOW },
];

const BAR_GAP = 8;

const Bars = ({ bars }: Readonly<{ bars: readonly Bar[] }>): ReactNode => {
  const frame = useCurrentFrame();
  const longest = Math.max(
    ...pipe(
      bars,
      Arr.map((bar) => bar.seconds),
    ),
  );
  return (
    <div className={`${AREA} font-jp flex flex-col justify-center gap-10`}>
      {pipe(
        bars,
        Arr.map((bar, index) => (
          <div className="flex flex-col gap-4" key={bar.label}>
            <div className="flex items-baseline justify-between text-white">
              <span className="text-[81px] font-black">{bar.label}</span>
              <span className="text-[148px] leading-none font-black" style={{ color: bar.color }}>
                {bar.seconds.toFixed(ONE_DECIMAL)}
                <span className="text-[76px]">秒</span>
              </span>
            </div>
            <div className="h-[100px] w-full">
              <div
                className="h-full min-w-[18px] rounded-[8px]"
                style={{
                  background: bar.color,
                  width: `${String((bar.seconds / longest) * 100 * grow(frame, index * BAR_GAP))}%`,
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
      <div className="mb-4 text-center text-[56px] font-black text-white/80">3つのプロジェクト</div>
      <div className="flex justify-between">
        {pipe(
          PROJECTS,
          Arr.map((name, index) => (
            <div
              className="flex w-[300px] flex-col items-center rounded-[14px] border-[5px] border-white/85 py-4 font-black"
              key={name}
              style={{ translate: `0 ${String((FULL - grow(frame, index * STAGGER)) * 40)}px` }}
            >
              <span className="text-[110px] leading-none">{name}</span>
            </div>
          )),
        )}
      </div>
      <svg className="h-[110px] w-full" viewBox="0 0 920 110">
        {pipe(
          [150, 460, 770],
          Arr.map((x) => (
            <line
              key={x}
              stroke={YELLOW}
              strokeDasharray="14 12"
              strokeLinecap="round"
              strokeWidth="8"
              x1={x}
              x2={460 + (x - 460) * 0.35}
              y1={10}
              y2={10 + 90 * linked}
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

const ERROR = "#ff6b5b";
const PASS = "#3ddc84";

const OldTool = ({ fixed }: Readonly<{ fixed: boolean }>): ReactNode => {
  const frame = useCurrentFrame();
  const result = pipe(
    Option.some({ text: "✓ build done", color: PASS }),
    Option.filter(() => fixed),
    Option.getOrElse(() => ({ text: "Error: Cannot find\nmodule 'esbuild'", color: ERROR })),
  );
  return (
    <div className={`${AREA} font-jp flex flex-col gap-6`}>
      <div className="font-code flex flex-col gap-3 rounded-[16px] bg-[#0b0d10] px-8 py-6 text-[44px] leading-snug">
        <span className="text-white/90">$ old-tool build</span>
        <span className="font-bold whitespace-pre-line" style={{ color: result.color }}>
          {result.text}
        </span>
      </div>
      <div
        className="font-code self-start rounded-[12px] bg-[#ffd400] px-6 py-2 text-[52px] font-bold text-[#1b1b1b]"
        style={{
          opacity: pipe(
            Option.some(grow(frame, NOTHING)),
            Option.filter(() => fixed),
            Option.getOrElse(() => NOTHING),
          ),
        }}
      >
        nodeLinker: hoisted
      </div>
    </div>
  );
};

const POP_FRAMES = 8;
const SETTLED = 60;
const STRIKE_AT = 4;
const STRIKE_WIDTH = 170;

const TryNow = ({ since = 0 }: Readonly<{ since?: number }>): ReactNode => {
  const frame = useCurrentFrame() + since;
  const pop = interpolate(frame, [0, POP_FRAMES], [0.6, 1], {
    easing: Easing.out(Easing.back(1.8)),
    extrapolateRight: "clamp",
  });
  return (
    <div className={`${AREA} font-jp flex flex-col items-center justify-center gap-10`}>
      <div className="font-code flex items-center gap-8 text-[84px] font-bold">
        <span className="relative text-white/60">
          npm
          <span
            className="absolute top-1/2 left-[-10px] h-[10px] rounded-full bg-[#ff6b5b]"
            style={{ width: `${String(STRIKE_WIDTH * grow(frame, STRIKE_AT))}px` }}
          />
        </span>
        <span className="text-white">→</span>
        <span className="text-[#ffd400]">pnpm</span>
      </div>
      <div className="text-[56px] font-black text-white">今すぐ試すなら</div>
      <div
        className="font-code rounded-[18px] bg-[#0b0d10] px-12 py-8 text-[92px] font-bold text-[#ffd400]"
        style={{ scale: String(pop) }}
      >
        npx get-pnpm
      </div>
    </div>
  );
};

const STAMP_FRAMES = 6;

const Stamp = ({ at }: Readonly<{ at: number }>): ReactNode => {
  const frame = useCurrentFrame();
  const pop = interpolate(frame, [at, at + STAMP_FRAMES], [2.2, 1], {
    easing: Easing.out((time) => Easing.cubic(time)),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      className="font-jp absolute top-[600px] right-[120px] rotate-[-8deg] rounded-[20px] border-[10px] border-[#ffd400] px-8 text-[170px] leading-tight font-black text-[#ffd400]"
      style={{ scale: String(pop), opacity: grow(frame, at) }}
    >
      0.4秒
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
        className={`absolute right-[170px] left-[90px] flex justify-center ${pick(CAPTION_TOP, shot.id, "top-[900px] h-[200px] items-center")}`}
      >
        <Caption
          className={`${pick(CAPTION, shot.id, BOLD)} ${pick(VOICE_FILL, String(shot.voice), "")}`}
          shot={shot}
        />
      </div>
      <Source />
    </>
  ),
};

export const draw: Readonly<Record<string, Draw>> = {
  intro: (shot) => <Intro shot={shot} />,
  wait: (shot) => (
    <>
      <Install run={{ ...NPM_RUN, crawl: WAIT_CRAWL }} shot={shot} />
      <Sfx at={0} kind="hook" shot={shot} />
    </>
  ),
  hook: (shot) => <Install run={{ ...NPM_RUN, crawl: HOOK_CRAWL }} shot={shot} />,
  try: (shot) => <Install run={PNPM_RUN} shot={shot} />,
  wow: (shot) => (
    <>
      <Bars bars={RACE} />
      <LightLeak />
      <Sfx at={0} kind="pop" shot={shot} />
    </>
  ),
  punch: (shot) => (
    <>
      <Log />
      <Dash />
      <Sfx at={0} kind="stamp" shot={shot} />
      <Sfx at={CROUCH_FRAMES - 2} kind="dash" shot={shot} />
    </>
  ),
  again: (shot) => (
    <>
      <Console at={[0, 6, 14]} rows={AGAIN_RUN} />
      <Stamp at={14} />
      <Sfx at={14} kind="pop" shot={shot} />
    </>
  ),
  disk: (shot) => <Sharing shot={shot} />,
  caveat: () => <OldTool fixed={false} />,
  fix: () => <OldTool fixed />,
  ending: (shot) => (
    <>
      <TryNow />
      <LightLeak />
      <Sfx at={0} kind="ending" shot={shot} />
    </>
  ),
  join: () => <TryNow since={SETTLED} />,
};
