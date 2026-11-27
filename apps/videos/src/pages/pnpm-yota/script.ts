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
    PC: "ピーシー",
  },
  bgm: BGM,
  images: { ...IMAGES, ...SHOTS },
  cuts: [
    { id: "hook", say: ["npmから乗り換えて", "一番よかったツールを紹介します"] },
    { id: "point1", say: ["1つ目、とにかく速い", "インストールが約10倍速くなりました"] },
    { id: "point2", say: ["2つ目、容量が減る", "同じパッケージはPCに1つだけ置かれます"] },
    { id: "point3", say: ["3つ目、コマンドはほぼ同じ", "npmの代わりに打つだけです"] },
    { id: "ending", say: ["気になった人は", "ぜひ試してみてください"], hold: 1.2 },
  ],
};
