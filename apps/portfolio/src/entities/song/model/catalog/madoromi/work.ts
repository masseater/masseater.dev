import type { Work } from "#/entities/song/model/song.ts";

export const work: Work = {
  title: "まどろみの窓",
  style: "pop",
  tempo: 92,
  length: "0:44",
  key: "G major",
  description: "AI が音楽理論の lint を通しながら fumx で書いた 92 BPM の小品",
  released: "2026-11-18T23:00:00+09:00",
  credits: [
    {
      what: "FM piano (TX81Z)",
      source: "Versilian Community Sample Library",
      license: "CC0",
      href: "https://github.com/sgossner/VCSL",
    },
    {
      what: "organ",
      source: "GeneralUser GS 2.0.3 (S. Christian Collins)",
      license: "GeneralUser GS License v2.0",
      href: "https://github.com/mrbumpy409/GeneralUser-GS",
    },
    {
      what: "sub bass",
      source: "Sonic Pi 同梱サンプル (Freesound 由来)",
      license: "CC0",
      href: "https://github.com/sonic-pi-net/sonic-pi/tree/dev/etc/samples",
    },
    {
      what: "TR-909 (JD-Xi) one-shots",
      source: "GRD-music- / Freesound",
      license: "CC0",
      href: "https://freesound.org/people/GRD-music-/",
    },
    {
      what: "plate reverb",
      source: "EMT 140 impulse response (Greg Hopkins)",
      license: "CC BY",
      href: "https://github.com/oramics/sampled/tree/master/IR/EMT140-Plate",
    },
  ],
};
