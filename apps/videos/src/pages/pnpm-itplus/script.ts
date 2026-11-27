import type { VideoScript } from "@masseater.dev/video-kit/script";

import { IMAGES, SHOTS, ZUNDAMON } from "#/shared/config/index.ts";

export const script: VideoScript = {
  title: "知っていると一歩先をいける pnpm",
  formats: ["vertical"],
  length: { vertical: 45 },
  voice: 3,
  readings: {
    pnpm: "ピーエヌピーエム",
    npm: "エヌピーエム",
    Vue: "ビュー",
    Vite: "ヴィート",
    Nuxt: "ナクスト",
  },
  bgm: { url: "https://amachamusic.chagasi.com/mp3/simplestyle.mp3", credit: "甘茶の音楽工房" },
  images: { ...IMAGES, ...SHOTS, ...ZUNDAMON },
  cuts: [
    { id: "intro", say: ["知っていると一歩先をいける\n**pnpm** を紹介するのだ！"] },
    {
      id: "what",
      say: ["npm の代わりに使える\n**パッケージ管理ツール**よ", "使い方は**npm とほぼ同じ**なの"],
      voice: 2,
    },
    { id: "fast", say: ["インストールが\n**npm の約10倍**速いのだ！"] },
    {
      id: "store",
      say: ["部品を**1か所にまとめて**\nリンクで共有するから", "**容量**もほとんど増えないの"],
      voice: 2,
    },
    { id: "users", say: ["**Vue** や **Vite** の開発でも\n使われているのだ"] },
    { id: "ending", say: ["みんなも pnpm で\n**開発してみてね！**"], voice: 0, hold: 1.2 },
  ],
};
