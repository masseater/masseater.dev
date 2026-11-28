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
  length: { vertical: 40 },
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
    { id: "hook", voice: ZUNDAMON, say: ["npmのインストール\n遅すぎるのだ"] },
    { id: "try", say: ["pnpmに変えてみ？"] },
    { id: "wow", voice: ZUNDAMON, say: ["4秒で終わったのだ！？"] },
    { id: "punch", say: ["**{爆速|ばくそく}**\nっしょ"], hold: 0.6 },
    { id: "again", say: ["2回目なら**0.4秒**"] },
    { id: "disk", say: ["パッケージは\nPCに1つだけ置くから", "容量もほぼ増えないんだよね"] },
    { id: "updates", say: ["しかも新機能が\n毎月のように増えてるんだよね"] },
    { id: "plenty", voice: ZUNDAMON, say: ["{至れり尽くせり|いたれりつくせり}なのだ"] },
    { id: "caveat", voice: ZUNDAMON, say: ["古いツールが\n動かないのだ…"] },
    { id: "fix", say: ["設定1行で直るよ"] },
    { id: "ending", say: ["これ味わっちゃうと\nもうnpmには戻れないっしょ"] },
    { id: "join", voice: ZUNDAMON, say: ["ボクも今すぐ\n変えるのだ！"], hold: 0.5 },
  ],
};
