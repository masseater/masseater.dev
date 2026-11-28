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
  title: "Oxlint",
  formats: ["vertical"],
  length: { vertical: 45 },
  voice: 8,
  readings: {
    Oxlint: "オーエックスリント",
    ESLint: "イーエスリント",
    lint: "リント",
    AI: "エーアイ",
    爆速: "ばくそく",
  },
  bgm: { ...BGM, loudThrough: "intro" },
  images: { ...IMAGES, ...SHOTS },
  cuts: [
    {
      id: "intro",
      say: ["爆速リンター、\nOxlintを", "30秒で|つむぎが|解説"],
      at: [
        VIDEO_START,
        onBeat(INTRO_BEATS.length),
        onBeat(INTRO_BEATS.voice),
        onBeat(INTRO_BEATS.call),
      ],
      speed: [INTRO_SPEED],
    },
    { id: "commit", voice: ZUNDAMON, say: ["よし、コミットなのだ"] },
    {
      id: "wait",
      voice: ZUNDAMON,
      say: ["…ESLint、\nまだ終わらないのだ…"],
      hold: 0.6,
    },
    { id: "try", say: ["Oxlintに変えてみ？"] },
    { id: "wow", voice: ZUNDAMON, say: ["えっ、もう\n終わったのだ！？"] },
    { id: "punch", say: ["**{爆速|ばくそく}**\nっしょ"], hold: 0.6 },
    {
      id: "save",
      voice: ZUNDAMON,
      say: ["これなら保存のたびに\n回せるのだ？"],
    },
    { id: "agent", say: ["そ、AIが直すたびに\n回しても**一瞬**じゃん"] },
    {
      id: "more",
      say: ["それだけじゃないよ！", "型チェックも移行も\n**全部**できるし！"],
    },
    {
      id: "strong",
      voice: ZUNDAMON,
      say: ["{至れり尽くせり|いたれりつくせり}\nなのだ！"],
    },
    {
      id: "caveat",
      voice: ZUNDAMON,
      say: [
        "じゃあボクのプロジェクト\nでも試すのだ",
        "…あれ、いつもの\nプラグインが使えないのだ？",
      ],
    },
    { id: "fix", say: ["そのプラグイン、\n1行でそのまま使えるよ"] },
    { id: "ending", say: ["ね、もうlint待ちには\n戻れないっしょ？"] },
    {
      id: "join",
      voice: ZUNDAMON,
      say: ["今すぐ全部\n変えるのだ！"],
      hold: 0.5,
    },
  ],
};
