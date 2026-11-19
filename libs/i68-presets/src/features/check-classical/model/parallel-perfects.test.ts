import { ruleCases } from "#/shared/lib/rule-cases.test.support.ts";

import { classicalPlugin } from "./preset.ts";

ruleCases({
  plugin: classicalPlugin,
  rule: "parallel-perfects",
  valid: [
    {
      name: "contrary motion into a fifth",
      song: `bar meter 4/4 tempo 120bpm {
  lead: G4 1/2, A4 1/2
  bass: C3 1/2, D2 1/2
}`,
    },
    {
      name: "oblique motion between two fifths",
      song: `bar meter 4/4 tempo 120bpm {
  lead: G4 1/2, G4 1/2
  bass: C3 1/2, C2 1/2
}`,
    },
    {
      name: "a fifth followed by a sixth",
      song: `bar meter 4/4 tempo 120bpm {
  lead: G4 1/2, B4 1/2
  bass: C3 1/2, D3 1/2
}`,
    },
    {
      name: "a repeated chord",
      song: `bar meter 4/4 tempo 120bpm {
  lead: G4 1/2, G4 1/2
  bass: C3 1/2, C3 1/2
}`,
    },
    {
      name: "parallel thirds",
      song: `bar meter 4/4 tempo 120bpm {
  lead: E4 1/4, F4 1/4, G4 1/4, A4 1/4
  bass: C3 1/4, D3 1/4, E3 1/4, F3 1/4
}`,
    },
  ],
  invalid: [
    {
      name: "parallel fifths moving up",
      song: `bar meter 4/4 tempo 120bpm {
  lead: G4 1/2, A4 1/2
  bass: C3 1/2, D3 1/2
}`,
      errors: ["2:17 Parallel fifths: G4/C3 to A4/D3 between lead and bass"],
    },
    {
      name: "parallel octaves moving down",
      song: `bar meter 4/4 tempo 120bpm {
  lead: D5 1/2, C5 1/2
  bass: D3 1/2, C3 1/2
}`,
      errors: ["2:17 Parallel octaves: D5/D3 to C5/C3 between lead and bass"],
    },
    {
      name: "parallel twelfths, which are compound fifths",
      song: `bar meter 4/4 tempo 120bpm {
  lead: G5 1/2, A5 1/2
  bass: C3 1/2, D3 1/2
}`,
      errors: ["2:17 Parallel fifths: G5/C3 to A5/D3 between lead and bass"],
    },
    {
      name: "parallel fifths named as written",
      song: `bar meter 4/4 tempo 120bpm {
  lead: F#4 1/2, G#4 1/2
  bass: B2 1/2, C#3 1/2
}`,
      errors: ["2:18 Parallel fifths: F#4/B2 to G#4/C#3 between lead and bass"],
    },
    {
      name: "parallel fifths across the bar line",
      song: `bar meter 4/4 tempo 120bpm {
  lead: G4 1/1
  bass: C3 1/1
}
bar {
  lead: F4 1/1
  bass: Bb2 1/1
}`,
      errors: ["6:9 Parallel fifths: G4/C3 to F4/Bb2 between lead and bass"],
    },
  ],
});
