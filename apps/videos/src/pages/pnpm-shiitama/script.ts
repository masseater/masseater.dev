import type { VideoScript } from "@masseater.dev/video-kit/script";

import { IMAGES, SHOTS, ZUNDAMON } from "#/shared/config/index.ts";

export const script: VideoScript = {
  title: "1分で分かるpnpm",
  formats: ["vertical"],
  length: { vertical: 40 },
  voice: 3,
  readings: {
    pnpm: "ピーエヌピーエム",
    npm: "エヌピーエム",
    node_modules: "ノードモジュールズ",
    "0.2秒": "れいてんにびょう",
    PC: "ピーシー",
  },
  bgm: { url: "https://amachamusic.chagasi.com/mp3/simplestyle.mp3", credit: "甘茶の音楽工房" },
  images: { ...IMAGES, ...SHOTS, ...ZUNDAMON },
  cuts: [
    { id: "hook", say: ["**1分で**\n**分かる**\n**pnpm**"] },
    { id: "intro", say: ["パッケージ\n管理ツール\nなのだ"] },
    { id: "speed", say: ["**npmの**\n**10倍**\n速いのだ"] },
    { id: "cache", say: ["2回目は\n**0.2秒**\nなのだ"] },
    { id: "link", say: ["パッケージを\n**コピー**\nしないのだ", "**リンク**\nで済ます\nのだ"] },
    { id: "why", say: ["だから\n**容量も**\n食わない", "パッケージは\n**PCに**\n**1つ**だけ"] },
    { id: "catch", say: ["ただし\n古いツールは\n**迷子**に", "なるのだ"], voice: 76 },
    { id: "ending", say: ["今すぐ\n**試すのだ！**"], hold: 1.2 },
  ],
};
