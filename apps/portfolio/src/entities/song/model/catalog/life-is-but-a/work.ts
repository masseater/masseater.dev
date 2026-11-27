import type { Work } from "#/entities/song/model/song.ts";

export const work: Work = {
  title: "life is but a",
  style: "speed garage",
  tempo: 160,
  length: "2:01",
  key: "C minor → D minor → C minor",
  description: "AI がコードだけで作った 160 BPM のスピードガラージ",
  released: "2026-11-16T09:00:30+09:00",
  credits: [
    {
      what: "声",
      source: "VocalSet (Wilkins, Seetharaman, Wahl, Pardo 2018)",
      license: "CC BY 4.0",
      href: "https://doi.org/10.5281/zenodo.1442513",
    },
    {
      what: "TR-909 (JD-Xi) one-shots",
      source: "GRD-music- / Freesound",
      license: "CC0",
      href: "https://freesound.org/people/GRD-music-/",
    },
    {
      what: "TR-808 one-shots",
      source: "Karman_Lyne / Freesound",
      license: "CC0",
      href: "https://freesound.org/people/Karman_Lyne/",
    },
    {
      what: "Juno-6 pad",
      source: "modularsamples / Freesound",
      license: "CC0",
      href: "https://freesound.org/people/modularsamples/",
    },
    {
      what: "bass, break, vinyl, snap",
      source: "Sonic Pi 同梱サンプル (Freesound 由来)",
      license: "CC0",
      href: "https://github.com/sonic-pi-net/sonic-pi/tree/dev/etc/samples",
    },
    {
      what: "organ, synth bass",
      source: "GeneralUser GS 2.0.3 (S. Christian Collins)",
      license: "GeneralUser GS License v2.0",
      href: "https://github.com/mrbumpy409/GeneralUser-GS",
    },
    {
      what: "FM piano (TX81Z), claps, tambourine, shaker, cabasa",
      source: "Versilian Community Sample Library",
      license: "CC0",
      href: "https://github.com/sgossner/VCSL",
    },
    {
      what: "plate reverb",
      source: "EMT 140 impulse response (Greg Hopkins)",
      license: "CC BY",
      href: "https://github.com/oramics/sampled/tree/master/IR/EMT140-Plate",
    },
  ],
};
