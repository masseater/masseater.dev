import type { VideoScript } from "@masseater.dev/video-kit/script";

import { IMAGES, SHOTS, ZUNDAMON } from "#/shared/config/index.ts";

export const script: VideoScript = {
  title: "一分でわかるpnpm",
  formats: ["vertical"],
  length: { vertical: 45 },
  voice: 3,
  readings: {
    pnpm: "ピーエヌピーエム",
    npm: "エヌピーエム",
    "Node.js": "ノードジェイエス",
    "43秒": "よんじゅうさんびょう",
  },
  bgm: { url: "https://amachamusic.chagasi.com/mp3/simplestyle.mp3", credit: "甘茶の音楽工房" },
  images: { ...IMAGES, ...SHOTS, ...ZUNDAMON },
  cuts: [
    { id: "opening", say: ["npmの代わりに使える\n**pnpm**を紹介するのだ"] },
    { id: "origin", say: ["2016年に生まれた\n**Node.js**のツールなのだ"], voice: 1 },
    {
      id: "speed",
      say: [
        "一番の特徴は\n**とにかく速い**ことなのだ",
        "npmが**43秒**かかる所を\n**4秒**で終わらせるのだ",
      ],
    },
    {
      id: "disk",
      say: ["しかも\n**容量を食わない**のだ", "同じパッケージは\n**PCに1つだけ**置くのだ"],
      voice: 1,
    },
    { id: "monorepo", say: ["モノレポだと\n**もう手放せない**のだ"] },
    { id: "complaint", say: ["ただ古いツールとは\n**相性が悪い**ことがあるのだ"], voice: 76 },
    { id: "rating", say: ["おすすめ度は\n**星4つ**なのだ"], voice: 1, hold: 0.6 },
    { id: "ending", say: ["迷ったら\n**pnpm**でいいのだ"], hold: 1.2 },
  ],
};
