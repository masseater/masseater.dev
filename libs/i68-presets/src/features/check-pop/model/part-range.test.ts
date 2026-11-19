import { ruleCases } from "#/shared/lib/rule-cases.test.support.ts";

import { popPlugin } from "./preset.ts";

ruleCases({
  plugin: popPlugin,
  rule: "part-range",
  valid: [
    {
      name: "a melody on the edges of C3-C6",
      song: `bar meter 4/4 tempo 120bpm {
  lead: C3 1/2, C6 1/2
}`,
    },
    {
      name: "a bass on the edges of E1-C4",
      song: `bar meter 4/4 tempo 120bpm {
  bass: E1 1/2, C4 1/2
}`,
    },
    {
      name: "harmony, drums and parts without a role anywhere",
      song: `bar meter 4/4 tempo 120bpm {
  pad: C1 1/2, C7 1/2
  kit: C0 1/1
  free: C8 1/1
}`,
    },
    {
      name: "a range set for one track by name",
      options: { ranges: { lead: ["A2", "E6"] } },
      song: `bar meter 4/4 tempo 120bpm {
  lead: A2 1/2, E6 1/2
}`,
    },
  ],
  invalid: [
    {
      name: "a melody below C3",
      song: `bar meter 4/4 tempo 120bpm {
  lead: B2 1/2, C4 1/2
}`,
      errors: ["2:9 B2 in lead is outside C3-C6"],
    },
    {
      name: "a countermelody above C6",
      song: `bar meter 4/4 tempo 120bpm {
  counter: C#6 1/1
}`,
      errors: ["2:12 C#6 in counter is outside C3-C6"],
    },
    {
      name: "a bass below E1 and above C4",
      song: `bar meter 4/4 tempo 120bpm {
  bass: D#1 1/2, D4 1/2
}`,
      errors: ["2:9 D#1 in bass is outside E1-C4", "2:18 D4 in bass is outside E1-C4"],
    },
    {
      name: "a note of a chord in the melody",
      song: `bar meter 4/4 tempo 120bpm {
  lead: [A2 C3] 1/1
}`,
      errors: ["2:10 A2 in lead is outside C3-C6"],
    },
    {
      name: "a role range set in the options",
      options: { ranges: { melody: ["A3", "E5"] } },
      song: `bar meter 4/4 tempo 120bpm {
  lead: F5 1/1
}`,
      errors: ["2:9 F5 in lead is outside A3-E5"],
    },
    {
      name: "a range named as the options write it",
      options: { ranges: { lead: ["A#3", "E5"] } },
      song: `bar meter 4/4 tempo 120bpm {
  lead: F5 1/1
}`,
      errors: ["2:9 F5 in lead is outside A#3-E5"],
    },
    {
      name: "the default bass range when only the melody range is set",
      options: { ranges: { lead: ["A3", "E5"] } },
      song: `bar meter 4/4 tempo 120bpm {
  lead: C4 1/1
  bass: D1 1/1
}`,
      errors: ["3:9 D1 in bass is outside E1-C4"],
    },
    {
      name: "a track range that wins over its role range",
      options: { ranges: { lead: ["C4", "C5"], melody: ["C3", "C6"] } },
      song: `bar meter 4/4 tempo 120bpm {
  lead: D5 1/1
}`,
      errors: ["2:9 D5 in lead is outside C4-C5"],
    },
  ],
});
