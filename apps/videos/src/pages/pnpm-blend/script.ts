import type { VideoScript } from "@masseater.dev/video-kit/script";

import { BGM, IMAGES, SHOTS } from "#/shared/config/index.ts";

export const script: VideoScript = {
  title: "pnpm",
  formats: ["vertical"],
  length: { vertical: 25 },
  voice: 8,
  readings: {
    pnpm: "ピーエヌピーエム",
    npm: "エヌピーエム",
    "4.6秒": "よんてんろくびょう",
    "0.2秒": "れいてんにびょう",
  },
  bgm: BGM,
  images: { ...IMAGES, ...SHOTS },
  cuts: [
    { id: "hook", say: ["npmのインストール\n遅すぎない？"] },
    { id: "try", say: ["pnpmに変えてみたら"] },
    { id: "wow", say: ["4.6秒で終わった"] },
    { id: "punch", say: ["**爆速**"], hold: 0.6 },
    { id: "again", say: ["2回目は**0.2秒**"] },
    { id: "disk", say: ["パッケージは\nPCに1つだけ置くから", "容量もほぼ増えない"] },
    { id: "caveat", say: ["古いツールだと\n動かないこともあるけど"] },
    { id: "ending", say: ["もうnpmには戻れない"], hold: 0.8 },
  ],
};
