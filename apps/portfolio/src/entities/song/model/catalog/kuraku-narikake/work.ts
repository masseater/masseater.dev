import type { Work } from "#/entities/song/model/song.ts";

export const work: Work = {
  title: "暗くなりかけ",
  style: "liquid funk",
  tempo: 175,
  length: "4:57",
  key: "C major",
  description: "AI がコードだけで作った 175 BPM のリキッドファンク",
  released: "2026-11-16T11:08:27+09:00",
  credits: [
    {
      what: "声",
      source: "VocalSet (Wilkins, Seetharaman, Wahl, Pardo 2018)",
      license: "CC BY 4.0",
      href: "https://doi.org/10.5281/zenodo.1442513",
    },
    {
      what: "rhodes",
      source: "jRhodes3d (Jeff Learman)",
      license: "CC BY-NC 4.0",
      href: "https://github.com/sfzinstruments/jlearman.jRhodes3d",
    },
    {
      what: "break",
      source: "gowers / Freesound 202537",
      license: "CC0",
      href: "https://freesound.org/s/202537/",
    },
    {
      what: "break",
      source: "tichec / Freesound 169870, 169872",
      license: "CC0",
      href: "https://freesound.org/s/169870/",
    },
    {
      what: "break",
      source: "Snapper4298 / Freesound 177006",
      license: "CC BY 3.0",
      href: "https://freesound.org/s/177006/",
    },
    {
      what: "break",
      source: "unfa / Freesound 185615",
      license: "CC BY 3.0",
      href: "https://freesound.org/s/185615/",
    },
    {
      what: "snare, hats, ride, crash, rim",
      source: "SM Drums (Scott McLean)",
      license: "public domain",
      href: "https://github.com/sfzinstruments/SMDrums",
    },
    {
      what: "kick, ghost snare, percussion",
      source: "Virtuosity Drums (Versilian Studios)",
      license: "CC0",
      href: "https://github.com/sfzinstruments/virtuosity_drums",
    },
    {
      what: "bass",
      source: "Growlybass, Meatbass (Karoryfer Samples)",
      license: "CC0",
      href: "https://github.com/sfzinstruments/karoryfer.growlybass",
    },
    {
      what: "vibraphone, wine glasses, clap",
      source: "Versilian Community Sample Library",
      license: "CC0",
      href: "https://github.com/sgossner/VCSL",
    },
    {
      what: "strings",
      source: "VSCO 2 Community Edition (Versilian Studios)",
      license: "CC0",
      href: "https://github.com/sgossner/VSCO-2-CE",
    },
    {
      what: "909 kick, clap, reverses",
      source: "GRD-music- / Freesound",
      license: "CC0",
      href: "https://freesound.org/people/GRD-music-/",
    },
    {
      what: "reese, vinyl",
      source: "Sonic Pi 同梱サンプル (Freesound 由来)",
      license: "CC0",
      href: "https://github.com/sonic-pi-net/sonic-pi/tree/dev/etc/samples",
    },
    {
      what: "plate reverb",
      source: "EMT 140 impulse response (Greg Hopkins)",
      license: "CC BY",
      href: "https://github.com/oramics/sampled/tree/master/IR/EMT140-Plate",
    },
  ],
};
