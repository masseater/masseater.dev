import { ruleCases } from "#/shared/lib/rule-cases.ts";

import { classicalPlugin } from "./preset.ts";

ruleCases({
  plugin: classicalPlugin,
  rule: "unresolved-dissonance",
  valid: [
    {
      name: "consonances on the strong beats",
      song: `bar meter 4/4 tempo 120bpm {
  lead: E4 1/2, G4 1/2
  bass: C3 1/1
}`,
    },
    {
      name: "a passing dissonance on a weak beat",
      song: `bar meter 4/4 tempo 120bpm {
  lead: E4 1/4, F4 1/4, G4 1/2
  bass: C3 1/1
}`,
    },
    {
      name: "a 4-3 suspension that resolves down by a half step",
      song: `bar meter 4/4 tempo 120bpm {
  lead: F4 1/2, E4 1/2
  bass: C3 1/1
}`,
    },
    {
      name: "a 9-8 suspension that resolves down by a whole step",
      song: `bar meter 4/4 tempo 120bpm {
  lead: D5 1/2, C5 1/2
  bass: C3 1/1
}`,
    },
    {
      name: "a dissonance on the third beat of 3/4, which is weak",
      song: `bar meter 3/4 tempo 120bpm {
  lead: E4 1/4, G4 1/4, F4 1/4
  bass: C3 3/4
}
bar {
  lead: E4 3/4
  bass: C3 3/4
}`,
    },
  ],
  invalid: [
    {
      name: "a fourth on the downbeat that leaps away",
      song: `bar meter 4/4 tempo 120bpm {
  lead: F4 1/2, A4 1/2
  bass: C3 1/1
}`,
      errors: ["2:9 F4 in lead is dissonant against the bass and does not step down"],
    },
    {
      name: "a seventh on the third beat that moves up",
      song: `bar meter 4/4 tempo 120bpm {
  lead: E4 1/2, B4 1/4, C5 1/4
  bass: C3 1/1
}`,
      errors: ["2:17 B4 in lead is dissonant against the bass and does not step down"],
    },
    {
      name: "a dissonance named as written",
      song: `bar meter 4/4 tempo 120bpm {
  lead: F#4 1/2, A#4 1/2
  bass: C#3 1/1
}`,
      errors: ["2:9 F#4 in lead is dissonant against the bass and does not step down"],
    },
    {
      name: "a dissonance as the last note",
      song: `bar meter 4/4 tempo 120bpm {
  lead: E4 1/2, D4 1/2
  bass: C3 1/1
}`,
      errors: ["2:17 D4 in lead is dissonant against the bass and does not step down"],
    },
  ],
});
