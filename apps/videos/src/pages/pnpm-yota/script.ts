import type { VideoScript } from "@masseater.dev/video-kit/script";

import { IMAGES, SHOTS } from "#/shared/config/index.ts";

export const script: VideoScript = {
  title: "pnpm",
  formats: ["vertical"],
  length: { vertical: 40 },
  voice: 8,
  readings: {
    pnpm: "ピーエヌピーエム",
    npm: "エヌピーエム",
    PC: "ピーシー",
  },
  bgm: { url: "https://amachamusic.chagasi.com/mp3/simplestyle.mp3", credit: "甘茶の音楽工房" },
  images: { ...IMAGES, ...SHOTS },
  cuts: [
    { id: "hook", say: ["npm から乗り換えて", "一番よかった道具を紹介します"] },
    { id: "point1", say: ["1つ目、とにかく速い", "インストールが約10倍速くなりました"] },
    { id: "point2", say: ["2つ目、容量が減る", "同じ部品は PC に1つだけ置かれます"] },
    { id: "point3", say: ["3つ目、コマンドはほぼ同じ", "npm の代わりに打つだけです"] },
    { id: "ending", say: ["気になった人は", "ぜひ試してみてください"], hold: 1.2 },
  ],
};
