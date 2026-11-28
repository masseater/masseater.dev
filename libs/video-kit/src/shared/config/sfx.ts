export const SFX = {
  hook: {
    url: "https://soundeffect-lab.info/sound/anime/mp3/text-impact1.mp3",
    page: "https://soundeffect-lab.info/sound/anime/",
    volume: 0.45,
  },
  stamp: {
    url: "https://soundeffect-lab.info/sound/anime/mp3/peta1.mp3",
    page: "https://soundeffect-lab.info/sound/anime/",
    volume: 0.55,
  },
  pop: {
    url: "https://soundeffect-lab.info/sound/anime/mp3/pa1.mp3",
    page: "https://soundeffect-lab.info/sound/anime/",
    volume: 0.5,
  },
  dash: {
    url: "https://soundeffect-lab.info/sound/anime/mp3/flee1.mp3",
    page: "https://soundeffect-lab.info/sound/anime/",
    volume: 0.6,
  },
  ending: {
    url: "https://soundeffect-lab.info/sound/anime/mp3/jean1.mp3",
    page: "https://soundeffect-lab.info/sound/anime/",
    volume: 0.45,
  },
} as const;

export type SfxKind = keyof typeof SFX;

export const SFX_CREDIT = "効果音ラボ";
