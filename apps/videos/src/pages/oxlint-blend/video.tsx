import type { Part } from "@masseater.dev/tachie";
import type { Draw, Look, Shot, Timeline } from "@masseater.dev/video-kit";
import {
  Caption,
  Picture,
  PsdNarrator,
  Sfx,
  imageOf,
} from "@masseater.dev/video-kit";
import { FPS } from "@masseater.dev/video-kit/script";
import type { SfxKind } from "@masseater.dev/video-kit/script";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";
import type { ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

import { tachiePsdPath } from "#/shared/config/index.ts";
import { pick } from "#/shared/lib/pick.ts";

import { INTRO_STEPS } from "./script.ts";

const BOLD =
  "caption-outline text-[68px] font-bold whitespace-pre-line [--outline:#1b1b1b] [--stroke:0.14em]";
const RED_LOOK =
  "caption-outline leading-none tracking-[-0.06em] scale-x-[0.86] [--fill:#ff1e1e] [--outline:#2a0000] [--stroke:0.16em] [--emphasis:#ff1e1e] drop-shadow-[0_10px_0_rgb(0_0_0/0.8)]";
const RED = `text-[150px] ${RED_LOOK}`;

const CAPTION: Readonly<Record<string, string>> = {
  punch: RED,
  intro: "hidden",
};
const VOICE_FILL: Readonly<Record<string, string>> = {
  "3": "[--fill:#c6f28a]",
};
const CAPTION_TOP: Readonly<Record<string, string>> = {};

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
    commit: {
      before: ["v1.!まゆ/*普通眉"],
      closed: "v1.!口/*ほほえみ",
      after: NONE,
      later: NONE,
    },
    wait: {
      before: ["v1.!まゆ/*普通眉"],
      closed: "v1.!口/*む",
      after: NONE,
      later: NONE,
    },
    save: {
      before: ["v1.!まゆ/*ごきげん眉"],
      closed: "v1.!口/*むふ",
      after: NONE,
      later: ["v1.!目/*にっこり"],
    },
    try: {
      before: [
        "v1.!まゆ/*ごきげん眉",
        "v1.!目/*基本目セット/!黒目/*カメラ目線",
      ],
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
    agent: {
      before: ["v1.!まゆ/*ごきげん眉", "v1.!目/*基本目セット/!黒目/*きらーん"],
      closed: "v1.!口/*にしー",
      after: ["v1.!右腕/*ピース", "v1.顔色/ほっぺ赤め"],
      later: NONE,
    },
    more: {
      before: [
        "v1.!まゆ/*ごきげん眉",
        "v1.!目/*基本目セット/!黒目/*カメラ目線",
      ],
      closed: "v1.!口/*むふ",
      after: ["v1.!右腕/*ゆびさし"],
      later: ["v1.!目/*基本目セット/!黒目/*きらーん"],
    },
    strong: {
      before: ["v1.!まゆ/*ごきげん眉", "v1.!目/*基本目セット/!黒目/*きらーん"],
      closed: "v1.!口/*にしー",
      after: ["v1.!右腕/*ピース"],
      later: NONE,
    },
    caveat: {
      before: ["v1.!まゆ/*普通眉"],
      closed: "v1.!口/*む",
      after: NONE,
      later: NONE,
    },
    fix: {
      before: [
        "v1.!まゆ/*ごきげん眉",
        "v1.!目/*基本目セット/!黒目/*カメラ目線",
      ],
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
const ZUNDA_ARM = (side: "右", pose: string): string =>
  `v1.*服装1/!${side}腕/*${pose}`;

const ZUNDAMON: Cast = {
  voice: 3,
  always: false,
  facing: "-scale-x-100",
  psd: "zundamon",
  className: "top-[1260px] left-[-180px] h-[1300px] w-[853px]",
  mouth: { half: "v1.!口/*ほあ", open: "v1.!口/*ほあー" },
  idle: {
    before: [OUTFIT, "v1.!眉/*普通眉"],
    closed: "v1.!口/*むー",
    after: NONE,
    later: NONE,
  },
  scenes: {
    commit: {
      before: [
        OUTFIT,
        "v1.!眉/*上がり眉",
        "v1.!目/*目セット/!黒目/*カメラ目線",
      ],
      closed: "v1.!口/*むふ",
      after: NONE,
      later: NONE,
    },
    wait: {
      before: [OUTFIT, "v1.!眉/*困り眉2", "v1.!目/*目セット/!黒目/*目逸らし2"],
      closed: "v1.!口/*むー",
      open: "v1.!口/*んあー",
      after: ["v1.記号など/汗2", "v1.!顔色/かげり", "v1.!枝豆/*枝豆萎え"],
      later: [ZUNDA_ARM("右", "苦しむ")],
    },
    try: {
      before: [
        OUTFIT,
        "v1.!眉/*上がり眉",
        "v1.!目/*目セット/!黒目/*カメラ目線",
      ],
      closed: "v1.!口/*ほー",
      after: NONE,
      later: NONE,
    },
    wow: {
      before: [OUTFIT, "v1.!眉/*上がり眉"],
      closed: "v1.!口/*ほあ",
      after: ["v1.!目/*〇〇", "v1.記号など/汗1"],
      later: [ZUNDA_ARM("右", "手を挙げる")],
    },
    save: {
      before: [OUTFIT, "v1.!眉/*上がり眉"],
      closed: "v1.!口/*ほあー",
      after: ["v1.!目/*〇〇", "v1.!顔色/*ほっぺ赤め"],
      later: NONE,
    },
    strong: {
      before: [OUTFIT, "v1.!眉/*上がり眉"],
      closed: "v1.!口/*ほあー",
      after: [
        "v1.!目/*〇〇",
        "v1.!顔色/*ほっぺ赤め",
        ZUNDA_ARM("右", "手を挙げる"),
      ],
      later: NONE,
    },
    caveat: {
      before: [
        OUTFIT,
        "v1.!眉/*上がり眉",
        "v1.!目/*目セット/!黒目/*カメラ目線",
      ],
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
      after: [
        "v1.!目/*にっこり",
        "v1.!顔色/*ほっぺ赤め",
        ZUNDA_ARM("右", "手を挙げる"),
      ],
      later: NONE,
    },
  },
};

const CAST = [ZUNDAMON, TSUMUGI] as const;

const partsOf = (
  cast: Cast,
  timeline: Timeline,
  frame: number,
): readonly Part[] =>
  pipe(
    timeline.cuts,
    Arr.findFirst(
      ({ from, duration }) => frame >= from && frame < from + duration,
    ),
    Option.map((cut) => {
      const scene = Option.getOrElse(
        Option.fromNullishOr(cast.scenes[cut.id]),
        () => cast.idle,
      );
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

const OFFSTAGE = -900;

const STAY_FRAMES = 150;

interface Span {
  readonly from: number;
  readonly to: number;
}

const staysOf = (cast: Cast, timeline: Timeline): readonly Span[] => {
  const spans: Span[] = [];
  const lines = pipe(
    timeline.cuts,
    Arr.filter((cut) => cut.voice === cast.voice),
  );
  for (const cut of lines) {
    const span = { from: cut.from, to: cut.from + cut.duration };
    const joined = pipe(
      Arr.last(spans),
      Option.filter((last) => span.from - last.to <= STAY_FRAMES),
      Option.map((last) => ({ from: last.from, to: span.to })),
    );
    if (Option.isSome(joined)) {
      spans.splice(-1, 1, joined.value);
    } else {
      spans.push(span);
    }
  }
  return spans;
};

const slideOf = (cast: Cast, timeline: Timeline, frame: number): number => {
  if (cast.always) {
    return 0;
  }
  const shown = pipe(
    staysOf(cast, timeline),
    Arr.some((span) => frame >= span.from && frame < span.to),
  );
  return shown ? 0 : OFFSTAGE;
};

const NOTHING_MOVED = 0;
const DASH_CUT = "punch";
const DASH_TAIL = 8;
const dashStartOf = (duration: number): number =>
  Math.max(0, duration - CROUCH_FRAMES - DASH_FRAMES - DASH_TAIL);
const BLUR_PER_PX = 0.04;

const dashOf = (cast: Cast, timeline: Timeline, frame: number): number =>
  pipe(
    timeline.cuts,
    Arr.findFirst((cut) => cut.id === DASH_CUT),
    Option.filter(() => cast.always),
    Option.filter(
      (cut) => frame >= cut.from && frame < cut.from + cut.duration,
    ),
    Option.map((cut) => frame - cut.from - dashStartOf(cut.duration)),
    Option.filter((local) => local >= 0),
    Option.map(dashX),
    Option.getOrElse(() => NOTHING_MOVED),
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
            <div
              className="absolute inset-0"
              key={cast.psd}
              style={{
                translate: `${String(slideOf(cast, timeline, frame) + dashOf(cast, timeline, frame))}px 0`,
                filter: `blur(${String(Math.max(NOTHING_MOVED, dashOf(cast, timeline, frame) - dashOf(cast, timeline, frame - 1)) * BLUR_PER_PX)}px)`,
              }}
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
const STREAKS = [
  { top: 380, width: 520, speed: 150, offset: 0 },
  { top: 520, width: 760, speed: 190, offset: 300 },
  { top: 760, width: 440, speed: 170, offset: 620 },
  { top: 230, width: 680, speed: 210, offset: 140 },
  { top: 640, width: 560, speed: 160, offset: 820 },
  { top: 860, width: 820, speed: 200, offset: 460 },
] as const;
const SCREEN = 1080;

const dashX = (frame: number): number =>
  interpolate(
    frame,
    [0, CROUCH_FRAMES, CROUCH_FRAMES + DASH_FRAMES],
    [-40, 0, 1500],
    {
      easing: Easing.in((time) => Easing.cubic(time)),
      extrapolateRight: "clamp",
    },
  );

const Streak = ({
  streak,
  frame,
}: Readonly<{
  streak: (typeof STREAKS)[number];
  frame: number;
}>): ReactNode => {
  const travel = SCREEN + streak.width;
  const left = SCREEN - ((streak.offset + frame * streak.speed) % travel);
  return (
    <div
      className="absolute h-[10px] rounded-full bg-white/70"
      style={{
        top: streak.top,
        left,
        width: streak.width,
        opacity: interpolate(
          frame,
          [CROUCH_FRAMES - 2, CROUCH_FRAMES + 2],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        ),
      }}
    />
  );
};

const BeforeDash = ({ shot }: Readonly<{ shot: Shot }>): ReactNode =>
  useCurrentFrame() < dashStartOf(shot.duration) ? (
    <Instant since={SETTLED} />
  ) : null;

const Streaks = ({ shot }: Readonly<{ shot: Shot }>): ReactNode => {
  const frame = useCurrentFrame() - dashStartOf(shot.duration);
  return (
    <AbsoluteFill className="overflow-hidden">
      {pipe(
        STREAKS,
        Arr.map((streak) => (
          <Streak frame={frame} key={streak.top} streak={streak} />
        )),
      )}
    </AbsoluteFill>
  );
};

const SOURCE = { name: "Oxlint", url: "oxc.rs" } as const;

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

const Pop = ({
  step,
  children,
}: Readonly<{ step: number; children: ReactNode }>): ReactNode => {
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
          爆速リンター
        </div>
      </Pop>
      <Pop step={1}>
        <div className="flex items-center gap-8">
          <Picture
            className="size-[200px] rounded-[44px] bg-white p-8"
            src={imageOf("oxlint")(shot)}
          />
          <div className="caption-plain font-sans text-[200px] leading-none font-semibold italic">
            Oxlint
          </div>
        </div>
      </Pop>
      <Pop step={2}>
        <div className="font-jp flex items-baseline text-[#ffd400]">
          <span className="text-[380px] leading-none font-black tracking-[-0.08em]">
            30
          </span>
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
      Arr.map((from, index) => (
        <Sfx at={from} key={from} kind={sfxOf(index)} shot={shot} />
      )),
    )}
  </>
);

const AREA = "absolute inset-x-[80px] top-[250px] h-[600px]";
const YELLOW = "#ffd400";
const ALARM = "#ff6b5b";
const PASS = "#3ddc84";
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

const BENCH_URL = "github.com/oxc-project/bench-linter";
const ESLINT_SECONDS = 21;
const OXLINT_SECONDS = 0.18;
const CRAWL_AT = [0, 0.25, 0.5, 0.62, 1] as const;
const COUNT_SHARE = 0.85;
const CLOCK_TURN = 12;

const Clock = ({
  frame,
  color,
}: Readonly<{ frame: number; color: string }>): ReactNode => (
  <svg className="size-[150px] shrink-0 text-white" viewBox="0 0 100 100">
    <circle
      cx="50"
      cy="50"
      fill="none"
      r="44"
      stroke="currentColor"
      strokeWidth="6"
    />
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
      stroke={color}
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

interface Run {
  readonly command: string;
  readonly crawl: readonly number[];
  readonly total: number;
  readonly digits: number;
  readonly color: string;
  readonly step: number;
  readonly done?: string;
}

const ESLINT_RUN = {
  command: "$ eslint .",
  total: ESLINT_SECONDS,
  digits: 1,
  color: ALARM,
  step: 8,
} as const;
const COMMIT_CRAWL = [0, 0.4, 1.1, 1.6, 2.4];
const WAIT_CRAWL = [2.4, 8.2, 14.6, 17.3, 21];
const OXLINT_RUN: Run = {
  command: "$ oxlint",
  crawl: [0, OXLINT_SECONDS, OXLINT_SECONDS, OXLINT_SECONDS, OXLINT_SECONDS],
  total: OXLINT_SECONDS,
  digits: 2,
  color: YELLOW,
  step: 1,
  done: "✓ Found 0 errors.",
};
const TRY_SHARE = 0.04;

const Install = ({
  shot,
  run,
  share = COUNT_SHARE,
  hook = false,
}: Readonly<{
  shot: Shot;
  run: Run;
  share?: number;
  hook?: boolean;
}>): ReactNode => {
  const frame = useCurrentFrame();
  const shown = Math.floor(frame / run.step) * run.step;
  const elapsed = interpolate(
    shown,
    pipe(
      CRAWL_AT,
      Arr.map((at) => shot.duration * share * at),
    ),
    run.crawl,
    { extrapolateRight: "clamp" },
  );
  const filled = elapsed / run.total;
  const finished = elapsed >= run.total;
  return (
    <div className={`${AREA} font-jp flex flex-col justify-center gap-10`}>
      <div className="font-code flex flex-col gap-2 rounded-[16px] bg-[#0b0d10] px-8 py-5 text-[56px] text-white/90">
        {hook ? (
          <span className="text-[40px] text-white/50">husky - pre-commit</span>
        ) : null}
        <span>{run.command}</span>
        {pipe(
          Option.fromNullishOr(run.done),
          Option.filter(() => finished),
          Option.map((done) => (
            <span className="font-bold" style={{ color: PASS }}>
              {done}
            </span>
          )),
          Option.getOrNull,
        )}
      </div>
      <div className="h-[100px] w-full shrink-0 rounded-[10px] border-[6px] border-white/85 p-[8px]">
        <div
          className="h-full rounded-[4px]"
          style={{ width: `${String(filled * 100)}%`, background: run.color }}
        />
      </div>
      <div className="flex items-center justify-between gap-4 text-white">
        <Clock color={run.color} frame={finished ? NOTHING : frame} />
        <span
          className="ml-auto text-[180px] leading-none font-black tabular-nums"
          style={{ color: run.color }}
        >
          {elapsed.toFixed(run.digits)}
        </span>
        <span className="text-[86px] font-black">秒</span>
      </div>
    </div>
  );
};

const CHECK_FROM = 2.4;

const Instant = ({ since = 0 }: Readonly<{ since?: number }>): ReactNode => {
  const frame = useCurrentFrame() + since;
  const pop = interpolate(frame, [0, SLAM_FRAMES + 2], [CHECK_FROM, FULL], {
    easing: Easing.out((time) => Easing.cubic(time)),
    extrapolateRight: "clamp",
  });
  return (
    <div
      className={`${AREA} font-jp flex flex-col items-center justify-center gap-6`}
    >
      <div className="font-code w-full rounded-[16px] bg-[#0b0d10] px-8 py-5 text-[56px] text-white/90">
        <div>$ oxlint</div>
        <div className="font-bold" style={{ color: PASS }}>
          ✓ Found 0 errors.
        </div>
      </div>
      <div
        className="flex size-[300px] items-center justify-center rounded-full text-[220px] leading-none font-black text-[#0b0d10]"
        style={{ background: PASS, scale: String(pop) }}
      >
        ✓
      </div>
      <div className="flex flex-col items-center text-[34px] font-bold text-white/60">
        <span>VS Code全体でESLint 21.0秒→Oxlint 0.18秒</span>
        <span className="font-code text-[28px]">{BENCH_URL}</span>
      </div>
    </div>
  );
};

const FEATURES = [
  "--type-aware",
  "--type-check",
  "tsrs",
  "870以上のルール",
  "@oxlint/migrate",
  "jsPlugins",
  "--fix",
  "React",
  "Vitest",
  "import",
  "unicorn",
  "jsx-a11y",
  "oxlint.config.ts",
] as const;
const FEATURE_GAP = 3;
const SLAM_FRAMES = 5;
const SLAM_FROM = 1.35;
const SETTLED = 60;

const slamOf = (frame: number, at: number): number =>
  interpolate(frame, [at, at + SLAM_FRAMES], [SLAM_FROM, FULL], {
    easing: Easing.out((time) => Easing.cubic(time)),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const shownOf = (frame: number, at: number): number => Number(frame >= at);

interface Loop {
  readonly trigger: string;
  readonly every: number;
}

const SAVE_LOOP: Loop = { trigger: "保存", every: 7 };
const AGENT_LOOP: Loop = { trigger: "AIの編集", every: 4 };

const ROW_POP_FROM = 1.08;

const rowPopOf = (frame: number, at: number): number =>
  interpolate(frame, [at, at + SLAM_FRAMES], [ROW_POP_FROM, FULL], {
    easing: Easing.out((time) => Easing.cubic(time)),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const NEWEST_TOP = 760;
const ROW_PITCH = 92;
const OFF_TOP = -ROW_PITCH;

const Loops = ({ loop }: Readonly<{ loop: Loop }>): ReactNode => {
  const frame = useCurrentFrame();
  const count = Math.floor(frame / loop.every) + 1;
  return (
    <AbsoluteFill className="font-jp">
      {pipe(
        Arr.range(1, count),
        Arr.map((index) => ({
          index,
          top: NEWEST_TOP - (frame / loop.every - (index - 1)) * ROW_PITCH,
        })),
        Arr.filter(({ top }) => top > OFF_TOP),
        Arr.map(({ index, top }) => (
          <div
            className="font-code absolute inset-x-[110px] flex h-[80px] items-center gap-6 rounded-[12px] bg-[#0b0d10] px-6 text-[46px]"
            key={index}
            style={{
              top,
              scale: String(rowPopOf(frame, (index - 1) * loop.every)),
            }}
          >
            <span className="w-[110px] text-white/50 tabular-nums">
              #{String(index)}
            </span>
            <span className="font-jp font-bold text-white">{loop.trigger}</span>
            <span className="text-white/60">→ oxlint</span>
            <span className="ml-auto font-bold" style={{ color: PASS }}>
              ✓
            </span>
          </div>
        )),
      )}
    </AbsoluteFill>
  );
};

const DIMMED = 0.22;

const Features = ({
  since = 0,
  at = 0,
  dimAt = Number.POSITIVE_INFINITY,
}: Readonly<{ since?: number; at?: number; dimAt?: number }>): ReactNode => {
  const frame = useCurrentFrame() + since;
  return (
    <div
      className="font-jp absolute inset-x-[60px] top-[300px] flex h-[560px] flex-wrap content-center justify-center gap-3"
      style={{
        opacity: interpolate(
          frame,
          [dimAt, dimAt + SLAM_FRAMES],
          [FULL, DIMMED],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        ),
      }}
    >
      {pipe(
        FEATURES,
        Arr.map((feature, index) => (
          <span
            className="font-code rounded-[12px] bg-[#0b0d10] px-4 py-1 text-[46px] font-bold text-white odd:text-[#ffd400]"
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

interface Highlight {
  readonly label: string;
  readonly code: string;
}

const HIGHLIGHTS: readonly Highlight[] = [
  { label: "型チェック", code: "oxlint --type-check" },
  { label: "設定の移行", code: "npx @oxlint/migrate" },
];
const HIGHLIGHT_GAP = 8;

const Highlights = ({
  at,
  since = 0,
}: Readonly<{ at: number; since?: number }>): ReactNode => {
  const frame = useCurrentFrame() + since;
  return (
    <div className={`${AREA} font-jp flex flex-col justify-center gap-8`}>
      {pipe(
        HIGHLIGHTS,
        Arr.map((item, index) => (
          <div
            className="flex flex-col items-start gap-3 rounded-[20px] border-[6px] border-[#ffd400] bg-[#0b0d10] px-8 py-6"
            key={item.label}
            style={{
              opacity: shownOf(frame, at + index * HIGHLIGHT_GAP),
              scale: String(slamOf(frame, at + index * HIGHLIGHT_GAP)),
            }}
          >
            <span className="text-[84px] leading-none font-black text-[#ffd400]">
              {item.label}
            </span>
            <span className="font-code text-[52px] font-bold whitespace-nowrap text-white">
              {item.code}
            </span>
          </div>
        )),
      )}
    </div>
  );
};

const FLIP_AT = 10;

const Plugin = ({ failAt }: Readonly<{ failAt: number }>): ReactNode => {
  const frame = useCurrentFrame();
  const shown = frame >= failAt ? FULL : NOTHING;
  return (
    <div className={`${AREA} font-jp flex flex-col justify-center`}>
      <div className="font-code flex flex-col gap-3 rounded-[16px] bg-[#0b0d10] px-8 py-6 text-[46px] leading-snug">
        <span className="text-white/90">$ npx @oxlint/migrate</span>
        <span className={shown === FULL ? "text-white/90" : "hidden"}>
          $ oxlint
        </span>
        <span
          className={shown === FULL ? "font-bold" : "hidden"}
          style={{ color: ALARM, opacity: grow(frame, failAt) }}
        >
          ✗ Rule &apos;my-team/no-raw-sql&apos;
          <br />
          {"  "}not found
        </span>
      </div>
    </div>
  );
};

interface ConfigLine {
  readonly text: string;
  readonly added?: boolean;
}

const CONFIG: readonly ConfigLine[] = [
  { text: "{" },
  { text: '  "jsPlugins": ["./lint/my-team.js"],', added: true },
  { text: '  "rules": {' },
  { text: '    "my-team/no-raw-sql": "error"' },
  { text: "  }" },
  { text: "}" },
];

const Config = (): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <div className={`${AREA} font-jp flex flex-col justify-center gap-5`}>
      <div className="overflow-hidden rounded-[16px] bg-[#0b0d10]">
        <div className="font-code bg-[#1d2128] px-6 py-2 text-[34px] text-white/70">
          .oxlintrc.json
        </div>
        <div className="font-code flex flex-col py-4 text-[38px] leading-[1.6] whitespace-pre">
          {pipe(
            CONFIG,
            Arr.map((line) =>
              line.added === true ? (
                <div
                  className="flex bg-[#3ddc84]/25 px-4 font-bold text-white"
                  key={line.text}
                  style={{
                    opacity: grow(frame, NOTHING),
                    scale: String(slamOf(frame, NOTHING)),
                  }}
                >
                  <span className="w-[28px] text-[#3ddc84]">+</span>
                  {line.text}
                </div>
              ) : (
                <div className="flex px-4 text-white/60" key={line.text}>
                  <span className="w-[28px]" />
                  {line.text}
                </div>
              ),
            ),
          )}
        </div>
      </div>
      <div
        className="font-code self-start rounded-[12px] bg-[#0b0d10] px-6 py-3 text-[40px] font-bold"
        style={{ color: PASS, opacity: shownOf(frame, FLIP_AT) }}
      >
        $ oxlint ✓ Found 0 errors.
      </div>
    </div>
  );
};

const POP_FRAMES = 8;
const STRIKE_AT = 4;
const STRIKE_WIDTH = 290;

const TryNow = ({ since = 0 }: Readonly<{ since?: number }>): ReactNode => {
  const frame = useCurrentFrame() + since;
  const pop = interpolate(frame, [0, POP_FRAMES], [0.6, 1], {
    easing: Easing.out(Easing.back(1.8)),
    extrapolateRight: "clamp",
  });
  return (
    <div
      className={`${AREA} font-jp flex flex-col items-center justify-center gap-10`}
    >
      <div className="font-code flex items-center gap-8 text-[84px] font-bold">
        <span className="relative text-white/60">
          ESLint
          <span
            className="absolute top-1/2 left-[-10px] h-[10px] rounded-full bg-[#ff6b5b]"
            style={{
              width: `${String(STRIKE_WIDTH * grow(frame, STRIKE_AT))}px`,
            }}
          />
        </span>
        <span className="text-white">→</span>
        <span className="text-[#ffd400]">Oxlint</span>
      </div>
      <div className="text-[56px] font-black text-white">設定ごと移すなら</div>
      <div
        className="font-code rounded-[18px] bg-[#0b0d10] px-10 py-8 text-[64px] font-bold whitespace-nowrap text-[#ffd400]"
        style={{ scale: String(pop) }}
      >
        npx @oxlint/migrate
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
  commit: (shot) => (
    <>
      <Install
        hook
        run={{ ...ESLINT_RUN, crawl: COMMIT_CRAWL }}
        share={FULL}
        shot={shot}
      />
      <Sfx at={0} kind="hook" shot={shot} />
    </>
  ),
  wait: (shot) => (
    <Install hook run={{ ...ESLINT_RUN, crawl: WAIT_CRAWL }} shot={shot} />
  ),
  try: (shot) => (
    <>
      <Install run={OXLINT_RUN} share={TRY_SHARE} shot={shot} />
      <Sfx at={2} kind="pop" shot={shot} />
    </>
  ),
  wow: (shot) => (
    <>
      <Instant />
      <LightLeak />
      <Sfx at={0} kind="pop" shot={shot} />
    </>
  ),
  punch: (shot) => (
    <>
      <BeforeDash shot={shot} />
      <Streaks shot={shot} />
      <Sfx at={0} kind="stamp" shot={shot} />
      <Sfx
        at={dashStartOf(shot.duration) + CROUCH_FRAMES - 2}
        kind="dash"
        shot={shot}
      />
    </>
  ),
  save: () => <Loops loop={SAVE_LOOP} />,
  agent: () => <Loops loop={AGENT_LOOP} />,
  more: (shot) => (
    <>
      <Features dimAt={lineStart(shot, 1)} />
      <Highlights at={lineStart(shot, 1)} />
      <Sfx at={lineStart(shot, 1)} kind="stamp" shot={shot} />
      {pipe(
        FEATURES,
        Arr.map((feature, index) => (
          <Sfx at={index * FEATURE_GAP} key={feature} kind="pop" shot={shot} />
        )),
      )}
    </>
  ),
  strong: () => (
    <>
      <Features dimAt={NOTHING} since={SETTLED} />
      <Highlights at={NOTHING} since={SETTLED} />
    </>
  ),
  caveat: (shot) => <Plugin failAt={lineStart(shot, 1)} />,
  fix: (shot) => (
    <>
      <Config />
      <Sfx at={0} kind="pop" shot={shot} />
      <Sfx at={FLIP_AT} kind="pop" shot={shot} />
    </>
  ),
  ending: (shot) => (
    <>
      <TryNow />
      <LightLeak />
      <Sfx at={0} kind="ending" shot={shot} />
    </>
  ),
  join: () => <TryNow since={SETTLED} />,
};
