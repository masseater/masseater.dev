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
  length: { vertical: 55 },
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
    {
      id: "mess",
      voice: ZUNDAMON,
      say: ["プロジェクトが増えるたびに\nディスクがパンパンなのだ…"],
    },
    { id: "ask", voice: ZUNDAMON, say: ["npm installも\n毎回{遅|おそ}いのだ…"] },
    { id: "try", say: ["pnpmに変えてみ？"] },
    { id: "wow", voice: ZUNDAMON, say: ["えっ、もう\n終わってるのだ！？"] },
    { id: "punch", say: ["**{爆速|ばくそく}**\nっしょ"], hold: 0.6 },
    { id: "why", voice: ZUNDAMON, say: ["なんでこんなに\n{違|ちが}うのだ？"] },
    { id: "npm", say: ["npmはプロジェクトごとに\n全部コピーして置くの"] },
    {
      id: "disk",
      say: [
        "pnpmはPCに1個だけ置いて\nリンクで使い回すの",
        "だから速いし\n容量もほぼ食わないんだよね",
      ],
    },
    { id: "more", say: ["便利機能も\n**盛りだくさん**だよ！"], hold: 0.2 },
    { id: "updates", say: ["しかも開発が\nめっちゃ活発なんだよね"] },
    { id: "strong", voice: ZUNDAMON, say: ["最強すぎるのだ！"] },
    {
      id: "caveat",
      voice: ZUNDAMON,
      say: ["さっそく前のプロジェクトも\npnpmにしてみるのだ", "…あれ、動かないのだ？"],
    },
    { id: "fix", say: ["pnpmは依存に{厳|きび}しめなの", "設定で\nnpmと同じ置き方にできるよ"] },
    { id: "ending", say: ["ね、もうnpmには\n戻れないっしょ？"] },
    { id: "join", voice: ZUNDAMON, say: ["全部のプロジェクト\n変えるのだ！"], hold: 0.5 },
  ],
};
