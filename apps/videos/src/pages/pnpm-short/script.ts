import type { VideoScript } from "@masseater.dev/video-kit/script";

export const script: VideoScript = {
  title: "pnpm",
  formats: ["vertical"],
  length: { vertical: 30 },
  voice: 8,
  readings: {
    pnpm: "ピーエヌピーエム",
    npm: "エヌピーエム",
    node_modules: "ノードモジュールズ",
  },
  bgm: { url: "https://amachamusic.chagasi.com/mp3/simplestyle.mp3", credit: "甘茶の音楽工房" },
  cuts: [
    { id: "opening", say: ["npm の代わり、**pnpm** って知ってる？"], hold: 0.6 },
    { id: "features", say: ["とにかく**速くて軽い**。"], hold: 1.6 },
    { id: "insight", say: ["モノレポだと**もう戻れない**。"], hold: 1.6 },
    { id: "complaints", say: ["古いツールとは**相性が悪い**。"], hold: 1.6 },
    { id: "rating", say: ["星**4つ**！"], hold: 0.8 },
    { id: "ending", say: ["迷ったら pnpm でいい。"], hold: 1.2 },
  ],
};
