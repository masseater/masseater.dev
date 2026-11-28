import type { Part } from "@masseater.dev/tachie";
import type { Draw, Look, Shot, Timeline } from "@masseater.dev/video-kit";
import { Caption, Picture, PsdNarrator, Sfx, imageOf } from "@masseater.dev/video-kit";
import { FPS } from "@masseater.dev/video-kit/script";
import type { SfxKind } from "@masseater.dev/video-kit/script";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";
import type { ReactNode } from "react";
import { AbsoluteFill, Easing, Freeze, interpolate, staticFile, useCurrentFrame } from "remotion";

import { tachiePsdPath } from "#/shared/config/index.ts";
import { pick } from "#/shared/lib/pick.ts";

import { INTRO_STEPS } from "./script.ts";

const BOLD =
  "caption-outline text-[68px] font-bold whitespace-pre-line [--outline:#1b1b1b] [--stroke:0.14em]";
const RED_LOOK =
  "caption-outline leading-none tracking-[-0.06em] scale-x-[0.86] [--fill:#ff1e1e] [--outline:#2a0000] [--stroke:0.16em] [--emphasis:#ff1e1e] drop-shadow-[0_10px_0_rgb(0_0_0/0.8)]";
const RED = `text-[140px] ${RED_LOOK}`;

const CAPTION: Readonly<Record<string, string>> = { punch: RED, intro: "hidden" };
const VOICE_FILL: Readonly<Record<string, string>> = { "3": "[--fill:#c6f28a]" };
const CAPTION_TOP: Readonly<Record<string, string>> = {
  disk: "top-[960px] h-[200px] items-center",
};

const FLASH_FRAMES = 9;

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
  readonly always: boolean;
  readonly facing: string;
  readonly psd: string;
  readonly className: string;
  readonly mouth: Mouth;
  readonly idle: Scene;
  readonly scenes: Readonly<Record<string, Scene>>;
}

const HALF = 0.5;
const NONE: readonly Part[] = [];

const TSUMUGI: Cast = {
  voice: 8,
  always: true,
  facing: "",
  psd: "tsumugi3",
  className: "top-[1130px] left-[330px] h-[1682px] w-[1000px]",
  mouth: { half: "v1.!口/*お", open: "v1.!口/*わあ" },
  idle: { before: NONE, closed: "v1.!口/*ほほえみ", after: NONE, later: NONE },
  scenes: {
    mess: { before: ["v1.!まゆ/*普通眉"], closed: "v1.!口/*む", after: NONE, later: NONE },
    ask: {
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
    catalog: {
      before: ["v1.!まゆ/*ごきげん眉", "v1.!目/*基本目セット/!黒目/*カメラ目線"],
      closed: "v1.!口/*むふ",
      after: ["v1.!右腕/*ゆびさし"],
      later: NONE,
    },
    synced: {
      before: ["v1.!まゆ/*ごきげん眉", "v1.!目/*にっこり"],
      closed: "v1.!口/*にしー",
      after: ["v1.!右腕/*ピース"],
      later: NONE,
    },
    patch: {
      before: ["v1.!まゆ/*ごきげん眉", "v1.!目/*基本目セット/!黒目/*カメラ目線"],
      closed: "v1.!口/*むふ",
      after: ["v1.!右腕/*ゆびさし"],
      later: ["v1.!目/*にっこり"],
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
      after: ["v1.!右腕/*ピース", "v1.顔色/ほっぺ赤め"],
      later: NONE,
    },
    more: {
      before: ["v1.!まゆ/*ごきげん眉", "v1.!目/*基本目セット/!黒目/*カメラ目線"],
      closed: "v1.!口/*むふ",
      after: ["v1.!右腕/*ゆびさし"],
      later: ["v1.!目/*基本目セット/!黒目/*きらーん"],
    },
    updates: {
      before: ["v1.!まゆ/*ごきげん眉", "v1.!目/*基本目セット/!黒目/*きらーん"],
      closed: "v1.!口/*にしー",
      after: ["v1.!右腕/*ピース"],
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
const ZUNDA_ARM = (side: "右", pose: string): string => `v1.*服装1/!${side}腕/*${pose}`;

const ZUNDAMON: Cast = {
  voice: 3,
  always: false,
  facing: "-scale-x-100",
  psd: "zundamon",
  className: "top-[1260px] left-[-180px] h-[1300px] w-[853px]",
  mouth: { half: "v1.!口/*ほあ", open: "v1.!口/*ほあー" },
  idle: { before: [OUTFIT, "v1.!眉/*普通眉"], closed: "v1.!口/*むー", after: NONE, later: NONE },
  scenes: {
    mess: {
      before: [OUTFIT, "v1.!眉/*困り眉1", "v1.!目/*目セット/!黒目/*目逸らし"],
      closed: "v1.!口/*むー",
      after: NONE,
      later: ["v1.記号など/汗1"],
    },
    ask: {
      before: [OUTFIT, "v1.!眉/*困り眉2", "v1.!目/*目セット/!黒目/*目逸らし2"],
      closed: "v1.!口/*むー",
      open: "v1.!口/*んあー",
      after: ["v1.記号など/汗2", "v1.!顔色/かげり", "v1.!枝豆/*枝豆萎え"],
      later: [ZUNDA_ARM("右", "苦しむ")],
    },
    try: {
      before: [OUTFIT, "v1.!眉/*上がり眉", "v1.!目/*目セット/!黒目/*カメラ目線"],
      closed: "v1.!口/*ほー",
      after: NONE,
      later: NONE,
    },
    catalog: {
      before: [OUTFIT, "v1.!眉/*上がり眉", "v1.!目/*目セット/!黒目/*カメラ目線"],
      closed: "v1.!口/*ほー",
      after: NONE,
      later: NONE,
    },
    synced: {
      before: [OUTFIT, "v1.!眉/*上がり眉"],
      closed: "v1.!口/*むふ",
      after: ["v1.!目/*にっこり", "v1.!顔色/*ほっぺ赤め", ZUNDA_ARM("右", "手を挙げる")],
      later: NONE,
    },
    patch: {
      before: [OUTFIT, "v1.!眉/*上がり眉", "v1.!目/*目セット/!黒目/*カメラ目線"],
      closed: "v1.!口/*ほー",
      after: NONE,
      later: NONE,
    },
    punch: {
      before: [OUTFIT, "v1.!眉/*上がり眉"],
      closed: "v1.!口/*ほあ",
      after: ["v1.!目/*〇〇"],
      later: NONE,
    },
    more: {
      before: [OUTFIT, "v1.!眉/*上がり眉"],
      closed: "v1.!口/*ほあ",
      after: ["v1.!目/*〇〇"],
      later: NONE,
    },
    updates: {
      before: [OUTFIT, "v1.!眉/*上がり眉"],
      closed: "v1.!口/*ほあ",
      after: ["v1.!目/*〇〇", "v1.!顔色/*ほっぺ赤め"],
      later: NONE,
    },
    why: {
      before: [OUTFIT, "v1.!眉/*上がり眉", "v1.!目/*目セット/!黒目/*カメラ目線"],
      closed: "v1.!口/*ほー",
      after: NONE,
      later: NONE,
    },
    other: {
      before: [OUTFIT, "v1.!眉/*上がり眉", "v1.!目/*目セット/!黒目/*カメラ目線"],
      closed: "v1.!口/*むふ",
      after: [ZUNDA_ARM("右", "指差し")],
      later: NONE,
    },
    wow: {
      before: [OUTFIT, "v1.!眉/*上がり眉"],
      closed: "v1.!口/*ほあ",
      after: ["v1.!目/*〇〇", "v1.記号など/汗1"],
      later: [ZUNDA_ARM("右", "手を挙げる")],
    },
    again: {
      before: [OUTFIT, "v1.!眉/*上がり眉"],
      closed: "v1.!口/*ほあー",
      after: ["v1.!目/*〇〇", "v1.!顔色/*ほっぺ赤め"],
      later: NONE,
    },
    strong: {
      before: [OUTFIT, "v1.!眉/*上がり眉"],
      closed: "v1.!口/*ほあー",
      after: ["v1.!目/*〇〇", "v1.!顔色/*ほっぺ赤め", ZUNDA_ARM("右", "手を挙げる")],
      later: NONE,
    },
    caveat: {
      before: [OUTFIT, "v1.!眉/*上がり眉", "v1.!目/*目セット/!黒目/*カメラ目線"],
      closed: "v1.!口/*むふ",
      after: NONE,
      later: [
        "v1.!眉/*困り眉1",
        "v1.!目/*目セット/!黒目/*目逸らし",
        "v1.記号など/汗3",
        "v1.!枝豆/*枝豆萎え",
        ZUNDA_ARM("右", "口元"),
      ],
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
    Option.getOrElse(() => cast.idle.before),
  );

const SLIDE_FRAMES = 6;
const OFFSTAGE = -900;

interface Span {
  readonly from: number;
  readonly to: number;
}

const staysOf = (cast: Cast, timeline: Timeline): readonly Span[] => {
  const lines = pipe(
    timeline.cuts,
    Arr.filter((cut) => cut.voice === cast.voice),
  );
  return pipe(
    Option.all([Arr.head(lines), Arr.last(lines)]),
    Option.map(([first, last]) => [{ from: first.from, to: last.from + last.duration }]),
    Option.getOrElse((): readonly Span[] => []),
  );
};

const slideOf = (cast: Cast, timeline: Timeline, frame: number): number => {
  if (cast.always) {
    return 0;
  }
  const visibility = pipe(
    staysOf(cast, timeline),
    Arr.map((span) =>
      Math.min(
        interpolate(frame, [span.from - SLIDE_FRAMES, span.from], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        interpolate(frame, [span.to, span.to + SLIDE_FRAMES], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      ),
    ),
    (shown) => Math.max(0, ...shown),
  );
  return OFFSTAGE * (1 - Easing.out((time) => Easing.cubic(time))(visibility));
};

const Board = ({ timeline }: Readonly<{ timeline: Timeline }>): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill className="bg-[#285a41]">
      <div className="absolute inset-x-0 top-[64px] h-[18px] bg-[#9a5a33]" />
      <div className="absolute inset-x-0 top-0 bottom-[28px] overflow-hidden">
        {pipe(
          CAST,
          Arr.map((cast) => (
            <div
              className="absolute inset-0"
              key={cast.psd}
              style={{ translate: `${String(slideOf(cast, timeline, frame))}px 0` }}
            >
              <div className={`absolute ${cast.className} ${cast.facing}`}>
                <PsdNarrator
                  className="inset-0"
                  parts={partsOf(cast, timeline, frame)}
                  psd={staticFile(tachiePsdPath(cast.psd))}
                  timeline={timeline}
                  voice={cast.voice}
                />
              </div>
            </div>
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

const CROUCH_FRAMES = 10;
const DASH_FRAMES = 10;
const TRAILS = [0, 1, 2, 3] as const;
const TRAIL_LAG = 1.6;
const STREAKS = [
  { top: 240, width: 520, speed: 150, offset: 0 },
  { top: 330, width: 760, speed: 190, offset: 300 },
  { top: 470, width: 440, speed: 170, offset: 620 },
  { top: 600, width: 680, speed: 210, offset: 140 },
  { top: 720, width: 560, speed: 160, offset: 820 },
  { top: 840, width: 820, speed: 200, offset: 460 },
] as const;
const SCREEN = 1080;

const dashX = (frame: number): number =>
  interpolate(frame, [0, CROUCH_FRAMES, CROUCH_FRAMES + DASH_FRAMES], [-40, 0, 1500], {
    easing: Easing.in((time) => Easing.cubic(time)),
    extrapolateLeft: "clamp",
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

const Dash = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => {
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
          <AbsoluteFill
            className="origin-bottom"
            key={trail}
            style={{
              translate: `${String(dashX(frame - trail * TRAIL_LAG))}px 0`,
              scale: `1 ${String(squash)}`,
              opacity: (TRAILS.length - trail) / TRAILS.length / (trail + 1),
            }}
          >
            {children}
          </AbsoluteFill>
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
const SETTLED = 60;
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
  return (
    <Freeze frame={SETTLED}>
      <Store />
    </Freeze>
  );
};

const FEATURES = [
  "catalogs",
  "pnpm patch",
  "pnpm dlx",
  "pnpm env",
  "--filter",
  "approve-builds",
  "minimumReleaseAge",
  "pnpm add crate:",
  "Rustツールチェーン",
  "エージェントスキル",
  "audit deprecations",
] as const;
const FEATURE_GAP = 3;
const SLAM_FRAMES = 5;
const SLAM_FROM = 1.35;

const slamOf = (frame: number, at: number): number =>
  interpolate(frame, [at, at + SLAM_FRAMES], [SLAM_FROM, FULL], {
    easing: Easing.out((time) => Easing.cubic(time)),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const shownOf = (frame: number, at: number): number => Number(frame >= at);

const Features = ({ since = 0, at = 0 }: Readonly<{ since?: number; at?: number }>): ReactNode => {
  const frame = useCurrentFrame() + since;
  return (
    <div className="font-jp absolute inset-x-[60px] top-[330px] flex h-[540px] flex-wrap content-center justify-center gap-3">
      {pipe(
        FEATURES,
        Arr.map((feature, index) => (
          <span
            className="font-code rounded-[12px] bg-[#0b0d10] px-4 py-1 text-[44px] font-bold text-white odd:text-[#ffd400]"
            key={feature}
            style={{
              opacity: shownOf(frame, at + index * FEATURE_GAP),
              scale: String(slamOf(frame, at + index * FEATURE_GAP)),
            }}
          >
            {feature}
          </span>
        )),
      )}
    </div>
  );
};

const ERROR = "#ff6b5b";
const PASS = "#3ddc84";

interface Repo {
  readonly path: string;
  readonly version: string;
}

const REPOS: readonly Repo[] = [
  { path: "apps/web", version: "4.0.7" },
  { path: "apps/api", version: "4.1.2" },
  { path: "libs/kit", version: "4.0.0" },
];
const LATEST = "4.1.2";
const REPO_GAP = 4;

type Stage = "mess" | "catalog" | "synced";

interface Pin {
  readonly text: string;
  readonly color: string;
}

const PINS: Readonly<Record<Stage, (repo: Repo) => Pin>> = {
  mess: (repo) => ({
    text: repo.version,
    color: pick({ [LATEST]: "#ffffff" }, repo.version, ALARM),
  }),
  catalog: () => ({ text: "catalog:", color: YELLOW }),
  synced: () => ({ text: `${LATEST} ✓`, color: PASS }),
};
const ENTER: Readonly<Record<Stage, number>> = { mess: 0, catalog: -SETTLED, synced: -SETTLED };

const Repos = ({ stage, at = 0 }: Readonly<{ stage: Stage; at?: number }>): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <div className="flex flex-col gap-4">
      {pipe(
        REPOS,
        Arr.map((repo, index) => {
          const pin = PINS[stage](repo);
          return (
            <div
              className="font-code flex items-baseline gap-6 rounded-[14px] bg-[#0b0d10] px-7 py-3"
              key={repo.path}
              style={{
                opacity: grow(frame, at + index * REPO_GAP),
                scale: String(slamOf(frame, at + index * REPO_GAP)),
              }}
            >
              <span className="w-[230px] text-[40px] text-white/60">{repo.path}</span>
              <span className="text-[48px] text-white/90">effect</span>
              <span
                className="ml-auto text-[56px] leading-none font-bold"
                style={{ color: pin.color }}
              >
                {pin.text}
              </span>
            </div>
          );
        }),
      )}
    </div>
  );
};

const YAML_LINES = ["catalog:", `  effect: ${LATEST}`] as const;
const PATCH_LINES = [
  "overrides:",
  "  esbuild: 0.25.12",
  "patchedDependencies:",
  "  rollup: patches/fix.patch",
] as const;

const Yaml = ({
  patchAt = NOTHING,
  goneAt = NOTHING,
  patched = false,
}: Readonly<{ patchAt?: number; goneAt?: number; patched?: boolean }>): ReactNode => {
  const frame = useCurrentFrame();
  const gone = pipe(
    Option.some(grow(frame, goneAt)),
    Option.filter(() => goneAt > NOTHING),
    Option.getOrElse(() => NOTHING),
  );
  return (
    <div className="font-code flex flex-col rounded-[16px] border-[4px] border-[#ffd400] bg-[#0b0d10] px-8 py-4 text-[50px] leading-snug">
      <span className="text-[36px] text-white/60">pnpm-workspace.yaml</span>
      {pipe(
        YAML_LINES,
        Arr.map((line) => (
          <span className="whitespace-pre text-white" key={line}>
            {line}
          </span>
        )),
      )}
      {pipe(
        PATCH_LINES,
        Arr.filter(() => patched),
        Arr.map((line, index) => (
          <span
            className="relative self-start whitespace-pre text-[#ffd400]"
            key={line}
            style={{
              opacity: grow(frame, patchAt + index * REPO_GAP) * (FULL - gone * 0.6),
              translate: `${String((FULL - grow(frame, patchAt + index * REPO_GAP)) * 80)}px 0`,
            }}
          >
            {line}
            <span
              className="absolute top-1/2 left-0 h-[6px] rounded-full bg-[#ff6b5b]"
              style={{ width: `${String(gone * 100)}%` }}
            />
          </span>
        )),
      )}
    </div>
  );
};

const Workspace = ({
  stage,
  at = ENTER[stage],
  children,
}: Readonly<{ stage: Stage; at?: number; children?: ReactNode }>): ReactNode => (
  <div className="font-jp absolute inset-x-[70px] top-[300px] flex flex-col gap-5">
    {children}
    <Repos at={at} stage={stage} />
  </div>
);

const Done = (): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <div className={`${AREA} font-code flex flex-col items-center justify-center gap-10`}>
      <div className="rounded-[18px] bg-[#0b0d10] px-12 py-8 text-[84px] font-bold text-[#ffd400]">
        $ pnpm install
      </div>
      <div
        className="text-[150px] leading-none font-black text-[#3ddc84]"
        style={{ scale: String(slamOf(frame, 0)) }}
      >
        ✓ Done
      </div>
    </div>
  );
};

const FIRST_MINOR = 0;
const LAST_MINOR = 24;
const COUNT_FRAMES = 36;

const Releases = ({ since = 0 }: Readonly<{ since?: number }>): ReactNode => {
  const frame = useCurrentFrame() + since;
  const minor = Math.floor(
    interpolate(frame, [0, COUNT_FRAMES], [FIRST_MINOR, LAST_MINOR], {
      easing: Easing.in((time) => Easing.quad(time)),
      extrapolateRight: "clamp",
    }),
  );
  return (
    <div className={`${AREA} font-jp flex flex-col items-center justify-center gap-8`}>
      <div className="font-code text-[150px] leading-none font-bold text-[#ffd400]">
        v12.{String(minor)}
      </div>
      <div className="flex flex-wrap justify-center gap-[8px]">
        {pipe(
          Arr.range(FIRST_MINOR, LAST_MINOR),
          Arr.map((step) => (
            <span
              className="size-[24px] rounded-full bg-[#ffd400]"
              key={step}
              style={{ opacity: pipe(Number(step <= minor), (lit) => 0.18 + lit * 0.82) }}
            />
          )),
        )}
      </div>
      <div className="font-code text-[48px] text-white/85">2026/08/26 → 11/26</div>
    </div>
  );
};

const OldTool = ({
  fixed,
  failAt = NOTHING,
}: Readonly<{ fixed: boolean; failAt?: number }>): ReactNode => {
  const frame = useCurrentFrame();
  const result = pipe(
    Option.some({ text: "✓ build done", color: PASS }),
    Option.filter(() => fixed && frame >= failAt),
    Option.getOrElse(() => ({ text: "Error: Cannot find\nmodule 'esbuild'", color: ERROR })),
  );
  return (
    <div className={`${AREA} font-jp flex flex-col gap-6`}>
      <div className="font-code flex flex-col gap-3 rounded-[16px] bg-[#0b0d10] px-8 py-6 text-[52px] leading-snug">
        <span className="text-white/90">$ pnpm run build</span>
        <span
          className="font-bold whitespace-pre-line"
          style={{
            color: result.color,
            opacity: pipe(
              Option.some(FULL),
              Option.filter(() => fixed),
              Option.getOrElse(() => grow(frame, failAt)),
            ),
          }}
        >
          {result.text}
        </span>
      </div>
      <div
        className="font-code flex flex-col rounded-[16px] border-[4px] border-[#ffd400] bg-[#0b0d10] px-8 py-4 text-[52px] leading-snug"
        style={{
          opacity: pipe(
            Option.some(grow(frame, failAt)),
            Option.filter(() => fixed),
            Option.getOrElse(() => NOTHING),
          ),
        }}
      >
        <span className="text-[36px] text-white/60">pnpm-workspace.yaml</span>
        <span className="font-bold text-[#ffd400]">nodeLinker: hoisted</span>
      </div>
    </div>
  );
};

const POP_FRAMES = 8;
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
  mess: (shot) => (
    <>
      <Workspace stage="mess" />
      {pipe(
        REPOS,
        Arr.map((repo, index) => (
          <Sfx at={index * REPO_GAP} key={repo.path} kind="pop" shot={shot} />
        )),
      )}
      <Sfx at={0} kind="hook" shot={shot} />
    </>
  ),
  ask: () => <Workspace at={-SETTLED} stage="mess" />,
  try: () => (
    <div className={`${AREA} flex items-center justify-center`}>
      <div className="font-code rounded-[18px] bg-[#0b0d10] px-12 py-8 text-[84px] font-bold text-[#ffd400]">
        $ pnpm install
      </div>
    </div>
  ),
  catalog: (shot) => (
    <>
      <Workspace stage="catalog">
        <Yaml />
      </Workspace>
      <Sfx at={0} kind="pop" shot={shot} />
    </>
  ),
  synced: (shot) => (
    <>
      <Workspace stage="synced">
        <Yaml />
      </Workspace>
      <Sfx at={0} kind="stamp" shot={shot} />
    </>
  ),
  patch: (shot) => (
    <>
      <div className="font-jp absolute inset-x-[70px] top-[300px]">
        <Yaml goneAt={lineStart(shot, 1)} patchAt={6} patched />
      </div>
      <Sfx at={6} kind="pop" shot={shot} />
    </>
  ),
  wow: (shot) => (
    <>
      <Done />
      <LightLeak />
      <Sfx at={0} kind="pop" shot={shot} />
    </>
  ),
  punch: (shot) => (
    <>
      <Dash>
        <Freeze frame={SETTLED}>
          <Done />
        </Freeze>
      </Dash>
      <Sfx at={0} kind="stamp" shot={shot} />
      <Sfx at={CROUCH_FRAMES - 2} kind="dash" shot={shot} />
    </>
  ),
  why: () => <Store />,
  disk: (shot) => <Sharing shot={shot} />,
  other: () => (
    <Freeze frame={SETTLED}>
      <Disk />
    </Freeze>
  ),
  more: (shot) => (
    <>
      <Features />
      {pipe(
        FEATURES,
        Arr.map((feature, index) => (
          <Sfx at={index * FEATURE_GAP} key={feature} kind="pop" shot={shot} />
        )),
      )}
    </>
  ),
  updates: (shot) => (
    <>
      <Releases />
      <Sfx at={COUNT_FRAMES} kind="stamp" shot={shot} />
    </>
  ),
  strong: () => <Releases since={SETTLED} />,
  caveat: (shot) => <OldTool failAt={lineStart(shot, 1)} fixed={false} />,
  fix: (shot) => <OldTool failAt={lineStart(shot, 1)} fixed />,
  ending: (shot) => (
    <>
      <TryNow />
      <LightLeak />
      <Sfx at={0} kind="ending" shot={shot} />
    </>
  ),
  join: () => <TryNow since={SETTLED} />,
};
