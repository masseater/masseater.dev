import type { VideoScript } from "@masseater.dev/video-kit/script";

import { BGM, IMAGES } from "#/shared/config/index.ts";

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
  bgm: BGM,
  images: { ...IMAGES },
  cuts: [
    { id: "ask", say: ["ねえpnpmって知ってる？"] },
    { id: "typo", say: ["npmの打ち間違いでしょ"], voice: 2 },
    { id: "deny", say: ["違うし！ちゃんと別物だし"] },
    { id: "quiz", say: ["じゃあpは何のp？"], voice: 2 },
    { id: "guess", say: ["…パフォーマンス？"], hold: 0.4 },
    { id: "answer", say: ["正式にはperformant npm", "速くて容量も食わないのよ"], voice: 2 },
    { id: "punch", say: ["知ってたなら聞かないでよ"], hold: 0.8 },
  ],
};
