import { ruleCases } from "#/shared/lib/rule-cases.ts";

import { voicingPlugin } from "./preset.ts";

ruleCases({
  plugin: voicingPlugin,
  rule: "chord-above-melody",
  valid: [
    {
      name: "a chord below the melody",
      song: `bar meter 4/4 tempo 120bpm {
  lead: rest 1/4, C5 3/4
  pad: [C4 E4 G4] 1/1
}`,
    },
    {
      name: "a chord note on the melody note",
      song: `bar meter 4/4 tempo 120bpm {
  lead: rest 1/4, G4 3/4
  pad: [C4 E4 G4] 1/1
}`,
    },
    {
      name: "a countermelody above the melody",
      song: `bar meter 4/4 tempo 120bpm {
  lead: rest 1/4, G4 3/4
  counter: C5 1/1
}`,
    },
  ],
  invalid: [
    {
      name: "a chord note above the melody",
      song: `bar meter 4/4 tempo 120bpm {
  lead: rest 1/4, G4 3/4
  pad: [C4 E4 A4] 1/1
}`,
      errors: ["3:15 A4 in pad sits above the melody note G4"],
    },
    {
      name: "a chord note close under the melody when the options ask for room",
      options: { within: 3 },
      song: `bar meter 4/4 tempo 120bpm {
  lead: rest 1/4, G4 3/4
  pad: [C4 E4] 1/1
}`,
      errors: ["3:12 E4 in pad sits just below the melody note G4"],
    },
  ],
});
