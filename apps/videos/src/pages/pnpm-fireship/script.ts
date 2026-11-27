import type { VideoScript } from "@masseater.dev/video-kit/script";

import { IMAGES } from "#/shared/config/index.ts";

export const script: VideoScript = {
  title: "pnpm in 60 seconds",
  formats: ["vertical"],
  length: { vertical: 40 },
  voice: 8,
  readings: {
    pnpm: "ピーエヌピーエム",
    npm: "エヌピーエム",
    "npm install": "エヌピーエム インストール",
    "content-addressable store": "コンテントアドレッサブル ストア",
  },
  bgm: { url: "https://amachamusic.chagasi.com/mp3/simplestyle.mp3", credit: "甘茶の音楽工房" },
  images: { ...IMAGES },
  cuts: [
    { id: "hook", say: ["npm installのたびにコーヒーを淹れていませんか"] },
    { id: "answer", say: ["pnpmなら、もう終わっています"] },
    { id: "born", say: ["2016年に生まれたパッケージマネージャーです"] },
    { id: "store", say: ["秘密はcontent-addressable store"] },
    { id: "once", say: ["同じパッケージはディスクに1回だけ保存して"] },
    { id: "link", say: ["あとはハードリンクで繋ぐだけ"] },
    { id: "fast", say: ["結果、npmの約10倍速い"] },
    { id: "phantom", say: ["ただし宣言していない依存は使えません"] },
    { id: "ending", say: ["これが1分でわかるpnpmでした"], hold: 1 },
  ],
};
