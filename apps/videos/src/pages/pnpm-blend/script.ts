import type { VideoScript } from "@masseater.dev/video-kit/script";

import { BGM, IMAGES, SHOTS } from "#/shared/config/index.ts";
import { VIDEO_START, onBeat } from "#/shared/lib/beat.ts";

const INTRO_SPEED = 2;
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
  length: { vertical: 30 },
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
    { id: "wait", say: ["まだ…？"], hold: 0.9 },
    { id: "hook", say: ["npmのインストール\n遅すぎない？"] },
    { id: "try", say: ["pnpmに変えてみたら"] },
    { id: "wow", say: ["4秒で終わった"] },
    { id: "punch", say: ["**爆速**"], hold: 0.6 },
    { id: "again", say: ["2回目は**0.4秒**"] },
    { id: "disk", say: ["パッケージは\nPCに1つだけ置くから", "容量もほぼ増えない"] },
    { id: "caveat", say: ["古いツールだと\n動かないこともあるけど", "設定1行で直る"] },
    { id: "ending", say: ["もうnpmには戻れない"], hold: 0.5 },
  ],
};
