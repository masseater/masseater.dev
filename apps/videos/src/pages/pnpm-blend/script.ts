import type { VideoScript } from "@masseater.dev/video-kit/script";

import { BGM, IMAGES, SHOTS } from "#/shared/config/index.ts";
import { VIDEO_START, onBeat } from "#/shared/lib/beat.ts";

const INTRO_SPEED = 2;
const ZUNDAMON = 3;
const INTRO_BEATS = { name: 1, length: 3, voice: 5, call: 6 } as const;

export const INTRO_STEPS: readonly number[] = [
  VIDEO_START,
  onBeat(INTRO_BEATS.name),
  onBeat(INTRO_BEATS.length),
  onBeat(INTRO_BEATS.voice),
];

export const script: VideoScript = {
  title: "pnpm",
  formats: ["vertical"],
  length: { vertical: 45 },
  voice: 8,
  readings: {
    pnpm: "ピーエヌピーエム",
    npm: "エヌピーエム",
    "4秒": "よんびょう",
    "0.4秒": "れいてんよんびょう",
  },
  bgm: { ...BGM, loudThrough: "intro" },
  images: { ...IMAGES, ...SHOTS },
  cuts: [
    {
      id: "intro",
      say: ["次世代のパッケージマネージャ\npnpmを", "30秒で|つむぎが|解説"],
      at: [
        VIDEO_START,
        onBeat(INTRO_BEATS.length),
        onBeat(INTRO_BEATS.voice),
        onBeat(INTRO_BEATS.call),
      ],
      speed: [INTRO_SPEED],
    },
    { id: "wait", voice: ZUNDAMON, say: ["まだ終わらないのだ…"], hold: 0.6 },
    { id: "hook", voice: ZUNDAMON, say: ["npmって\nなんでこんなに遅いのだ…"] },
    { id: "try", say: ["pnpmに変えてみ？"] },
    { id: "wow", voice: ZUNDAMON, say: ["4秒で終わったのだ！？"] },
    { id: "punch", say: ["**{爆速|ばくそく}**\nっしょ"], hold: 0.6 },
    { id: "again", say: ["2回目なんて**0.4秒**じゃん"] },
    { id: "disk", say: ["パッケージは\nPC全体で使い回すの", "だから容量も\nほぼ食わないんだ"] },
    { id: "more", say: ["それだけじゃないよ！", "便利機能も\n**盛りだくさん**！"], hold: 0.8 },
    { id: "updates", say: ["しかも3か月で\n**24回**もアプデしてるし"] },
    { id: "strong", voice: ZUNDAMON, say: ["最強すぎるのだ！"] },
    {
      id: "caveat",
      voice: ZUNDAMON,
      say: ["さっそく前のプロジェクトも\npnpmにしてみるのだ", "…あれ、動かないのだ"],
    },
    { id: "fix", say: ["それ、設定1行で直るよ"] },
    { id: "ending", say: ["ね、もうnpmには\n戻れないっしょ？"] },
    { id: "join", voice: ZUNDAMON, say: ["全部のプロジェクト\n変えるのだ！"], hold: 0.5 },
  ],
};
