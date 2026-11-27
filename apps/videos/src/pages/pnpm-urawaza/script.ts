import type { VideoScript } from "@masseater.dev/video-kit/script";

import { IMAGES, SHOTS, ZUNDAMON } from "#/shared/config/index.ts";

export const script: VideoScript = {
  title: "容量不足を一発で解決する裏技",
  formats: ["vertical"],
  length: { vertical: 45 },
  voice: 3,
  readings: {
    pnpm: "ピーエヌピーエム",
    npm: "エヌピーエム",
    node_modules: "ノードモジュールズ",
    PC: "ピーシー",
  },
  bgm: { url: "https://amachamusic.chagasi.com/mp3/simplestyle.mp3", credit: "甘茶の音楽工房" },
  images: { ...IMAGES, ...SHOTS, ...ZUNDAMON },
  cuts: [
    { id: "problem", say: ["PCの容量が\nいつの間にか**いっぱい**なのだ…"], voice: 76 },
    { id: "cause", say: ["犯人はプロジェクトごとの\n**node_modules**なのだ"] },
    { id: "trick", say: ["そこで裏技！\n**pnpm**に替えるだけなのだ"], voice: 1 },
    {
      id: "how",
      say: ["同じパッケージは**PCに1つだけ**置いて", "各プロジェクトからは\n**リンク**で使うのだ"],
    },
    { id: "speed", say: ["しかもインストールが\n**npmの約10倍**速いのだ"] },
    { id: "start", say: ["**npm install -g pnpm**\nで今日から使えるのだ"] },
    { id: "ending", say: ["容量に困ったら\n**試してみるのだ！**"], voice: 1, hold: 1.2 },
  ],
};
