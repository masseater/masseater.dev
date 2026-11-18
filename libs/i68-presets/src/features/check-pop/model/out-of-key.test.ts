import { ruleCases } from "#/shared/lib/rule-cases.ts";

import { popPlugin } from "./preset.ts";

const C_MAJOR = `bar meter 4/4 tempo 120bpm {
  lead: E4 1/4, D4 1/4, C4 1/2
  pad: [C3 E3 G3] 1/1
  bass: C2 1/1
}
bar {
  lead: A4 1/4, G4 1/4, F4 1/2
  pad: [C3 F3 A3] 1/1
  bass: F1 1/1
}
bar {
  lead: B4 1/4, A4 1/4, G4 1/2
  pad: [D3 G3 B3] 1/1
  bass: G1 1/1
}
bar {
  lead: E4 1/4, D4 1/4, C4 1/2
  pad: [C3 E3 G3] 1/1
  bass: C2 1/1
}`;

const after = (bars: string): string => `${C_MAJOR}\n${bars}`;

ruleCases({
  plugin: popPlugin,
  rule: "out-of-key",
  valid: [
    {
      name: "a melody that stays in C major over I and V",
      song: `bar meter 4/4 tempo 120bpm {
  lead: E4 1/4, D4 1/4, C4 1/2
  pad: [C3 E3 G3] 1/1
  bass: C2 1/1
}
bar {
  lead: B4 1/4, A4 1/4, G4 1/2
  pad: [D3 G3 B3] 1/1
  bass: G1 1/1
}`,
    },
    {
      name: "a borrowed note that the chord under it also plays",
      song: after(`bar {
  lead: Bb4 1/2, F4 1/2
  pad: [Bb2 D3 F3] 1/1
  bass: Bb1 1/1
}
bar {
  lead: E4 1/1
  pad: [C3 E3 G3] 1/1
  bass: C2 1/1
}`),
    },
    {
      name: "a borrowed chord that the bass and the harmony agree on",
      song: after(`bar {
  pad: [Ab2 C3 Eb3] 1/1
  bass: Ab1 1/1
}
bar {
  pad: [C3 E3 G3] 1/1
  bass: C2 1/1
}`),
    },
    {
      name: "the raised seventh and sixth of A minor",
      song: `bar meter 4/4 tempo 120bpm {
  lead: A4 1/4, B4 1/4, C5 1/4, B4 1/4
  pad: [A2 C3 E3] 1/1
  bass: A1 1/1
}
bar {
  lead: E4 1/4, F#4 1/4, G#4 1/4, A4 1/4
  pad: [E3 G#3 B3] 1/1
  bass: E1 1/1
}
bar {
  lead: A4 1/1
  pad: [A2 C3 E3] 1/1
  bass: A1 1/1
}`,
    },
    {
      name: "a short chromatic passing note between two notes a whole step apart",
      song: after(`bar {
  lead: C4 1/4, C#4 1/8, D4 1/8, E4 1/2
  pad: [C3 E3 G3] 1/1
  bass: C2 1/1
}`),
    },
    {
      name: "a short chromatic lower neighbour that returns",
      song: after(`bar {
  lead: G4 1/4, F#4 1/8, G4 1/8, E4 1/2
  pad: [C3 E3 G3] 1/1
  bass: C2 1/1
}`),
    },
    {
      name: "drum hits, which have no key",
      song: `bar meter 4/4 tempo 120bpm {
  lead: E4 1/1
  pad: [C3 E3 G3] 1/1
  bass: C2 1/1
  kit: C#2 1/4, F#2 1/4, C#2 1/4, F#2 1/4
}`,
    },
    {
      name: "a modulation to E major in the next section",
      song: `bar meter 4/4 tempo 120bpm section verse {
  lead: E4 1/4, D4 1/4, C4 1/2
  pad: [C3 E3 G3] 1/1
  bass: C2 1/1
}
bar {
  lead: B4 1/4, A4 1/4, G4 1/2
  pad: [D3 G3 B3] 1/1
  bass: G1 1/1
}
bar section chorus {
  lead: G#4 1/4, F#4 1/4, E4 1/2
  pad: [E3 G#3 B3] 1/1
  bass: E2 1/1
}
bar {
  lead: D#5 1/4, C#5 1/4, B4 1/2
  pad: [B2 D#3 F#3] 1/1
  bass: B1 1/1
}`,
    },
  ],
  invalid: [
    {
      name: "a melody note outside the key and the chord, named as written",
      song: after(`bar {
  lead: E4 1/4, D#4 1/2, C4 1/4
  pad: [C3 E3 G3] 1/1
  bass: C2 1/1
}`),
      errors: [`22:17 D#4 in lead is outside C major and the chord under it`],
    },
    {
      name: "a long chromatic note even between two scale notes",
      song: after(`bar {
  lead: C4 1/4, C#4 1/2, D4 1/4
  pad: [C3 E3 G3] 1/1
  bass: C2 1/1
}`),
      errors: [`22:17 C#4 in lead is outside C major and the chord under it`],
    },
    {
      name: "a harmony note that no other part supports",
      song: after(`bar {
  lead: E4 1/2, G4 1/2
  pad: [C3 E3 F#3] 1/1
  bass: C2 1/1
}`),
      errors: [`23:15 F#3 in pad is outside C major and the chord under it`],
    },
    {
      name: "a bass note that no other part supports",
      song: after(`bar {
  lead: E4 1/2, G4 1/2
  pad: [C3 E3 G3] 1/1
  bass: C#2 1/1
}`),
      errors: [`24:9 C#2 in bass is outside C major and the chord under it`],
    },
    {
      name: "a note in a part without a role",
      song: after(`bar {
  lead: E4 1/2, G4 1/2
  pad: [C3 E3 G3] 1/1
  bass: C2 1/1
  free: Eb5 1/1
}`),
      errors: [`25:9 Eb5 in free is outside C major and the chord under it`],
    },
  ],
});
