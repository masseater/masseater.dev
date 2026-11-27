import type { VideoScript } from "@masseater.dev/video-kit/script";

import { BGM, IMAGES, SHOTS } from "#/shared/config/index.ts";

export const script: VideoScript = {
  title: "pnpm",
  formats: ["vertical"],
  length: { vertical: 40 },
  voice: 8,
  readings: {
    pnpm: "ピーエヌピーエム",
    npm: "エヌピーエム",
    "npm install -g pnpm": "エヌピーエムインストールジーピーエヌピーエム",
    PC: "ピーシー",
  },
  bgm: BGM,
  images: { ...IMAGES, ...SHOTS },
  cuts: [
    { id: "hook", say: ["インストールを待つ時間", "もったいなくないですか？"] },
    { id: "name", say: ["今日ご紹介するのは", "pnpmです"] },
    { id: "speed", say: ["使い方はnpmと同じまま", "インストールが約10倍速くなります"] },
    { id: "disk", say: ["同じパッケージはPCに1つだけ", "容量もほとんど増えません"] },
    { id: "install", say: ["導入はnpm install -g pnpm", "これだけです"] },
    { id: "ending", say: ["ぜひ試してみてください"], hold: 1.2 },
  ],
};
