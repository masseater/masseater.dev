import type { VideoScript } from "@masseater.dev/video-kit/script";

import { IMAGES } from "#/shared/config/index.ts";

export const script: VideoScript = {
  title: "pnpm",
  formats: ["vertical"],
  length: { vertical: 40 },
  voice: 8,
  readings: {
    pnpm: "ピーエヌピーエム",
    npm: "エヌピーエム",
    "performant npm": "パフォーマント エヌピーエム",
  },
  bgm: { url: "https://amachamusic.chagasi.com/mp3/simplestyle.mp3", credit: "甘茶の音楽工房" },
  images: { ...IMAGES },
  cuts: [
    { id: "ask", say: ["ねえ pnpm って知ってる？"] },
    { id: "typo", say: ["npm の打ち間違いでしょ"], voice: 2 },
    { id: "deny", say: ["違うし！ちゃんと別物だし"] },
    { id: "quiz", say: ["じゃあ p は何の p？"], voice: 2 },
    { id: "guess", say: ["…パフォーマンス？"], hold: 0.4 },
    { id: "answer", say: ["正式には performant npm", "速くて容量も食わないのよ"], voice: 2 },
    { id: "punch", say: ["知ってたなら聞かないでよ"], hold: 0.8 },
  ],
};
