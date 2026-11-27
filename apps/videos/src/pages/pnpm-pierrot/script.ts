import type { VideoScript } from "@masseater.dev/video-kit/script";

import { IMAGES, SHOTS, ZUNDAMON } from "#/shared/config/index.ts";

export const script: VideoScript = {
  title: "最新ツール解説「pnpm」",
  formats: ["vertical"],
  length: { vertical: 45 },
  voice: 3,
  readings: {
    pnpm: "ピーエヌピーエム",
    npm: "エヌピーエム",
    "43秒": "よんじゅうさんびょう",
    PC: "ピーシー",
  },
  bgm: { url: "https://amachamusic.chagasi.com/mp3/simplestyle.mp3", credit: "甘茶の音楽工房" },
  images: { ...IMAGES, ...SHOTS, ...ZUNDAMON },
  cuts: [
    { id: "question", say: ["最近よく聞く\n**pnpm**って何なのだ？"] },
    { id: "meaning", say: ["npmと同じ\n**パッケージ管理ツール**よ"], voice: 2 },
    { id: "speed", say: ["npmで**43秒**の作業が\n**4秒**で終わるの"], voice: 2 },
    { id: "surprise", say: ["**10倍**も\n速いのだ！？"], voice: 7 },
    {
      id: "disk",
      say: ["同じパッケージは\n**PCに1つだけ**置くから", "**容量**も減らせるわ"],
      voice: 2,
    },
    { id: "switch", say: ["じゃあ全部\n**乗り換える**のだ！"] },
    {
      id: "caution",
      say: ["古いツールとは\n**相性が悪い**こともあるから", "まずは**新しい作品**で試してね"],
      voice: 2,
    },
    { id: "ending", say: ["さっそく\n**試してみる**のだ！"], hold: 1.2 },
  ],
};
