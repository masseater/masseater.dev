import type { VideoScript } from "@masseater.dev/video-kit/script";

import { IMAGES, SHOTS } from "#/shared/config/index.ts";

export const script: VideoScript = {
  title: "pnpm",
  formats: ["vertical"],
  length: { vertical: 35 },
  voice: 8,
  readings: {
    pnpm: "ピーエヌピーエム",
    npm: "エヌピーエム",
    "0.2秒": "れいてんにびょう",
  },
  bgm: { url: "https://amachamusic.chagasi.com/mp3/simplestyle.mp3", credit: "甘茶の音楽工房" },
  images: { ...IMAGES, ...SHOTS },
  cuts: [
    { id: "hook", say: ["npmのインストール\n遅すぎない！？"] },
    { id: "try", say: ["で、噂のpnpm\n入れてみた"] },
    { id: "wow", say: ["えっ\nもう終わった！？"], hold: 0.5 },
    { id: "again", say: ["2回目なんて\n0.2秒"] },
    { id: "disk", say: ["しかも容量も\nほぼ増えないらしい"] },
    { id: "caveat", say: ["ただ古いツールだと\n動かないこともあるっぽい", "そこだけ注意っす"] },
    { id: "ending", say: ["もうnpmには\n戻れないっすねぇ"], hold: 0.8 },
  ],
};
