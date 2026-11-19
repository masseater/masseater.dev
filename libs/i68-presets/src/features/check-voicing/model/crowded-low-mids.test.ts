import { ruleCases } from "#/shared/lib/rule-cases.test.support.ts";

import { voicingPlugin } from "./preset.ts";

ruleCases({
  plugin: voicingPlugin,
  rule: "crowded-low-mids",
  valid: [
    {
      name: "three notes between A2 and B3",
      song: `bar meter 4/4 tempo 120bpm {
  pad: [A2 C3 E3] 1/1
}`,
    },
    {
      name: "a fourth note at C4, above the low mids",
      song: `bar meter 4/4 tempo 120bpm {
  pad: [A2 C3 E3 C4] 1/1
}`,
    },
    {
      name: "a bass below E2 under three notes",
      song: `bar meter 4/4 tempo 120bpm {
  bass: A1 1/1
  pad: [A2 C3 E3] 1/1
}`,
    },
    {
      name: "four notes when the options allow four",
      options: { max: 4 },
      song: `bar meter 4/4 tempo 120bpm {
  pad: [A2 C3 E3 G3] 1/1
}`,
    },
  ],
  invalid: [
    {
      name: "four notes of one chord between A2 and B3",
      song: `bar meter 4/4 tempo 120bpm {
  pad: [A2 C3 E3 G3] 1/1
}`,
      errors: ["2:9 4 notes crowd the low mids in bar 1: A2, C3, E3, G3"],
    },
    {
      name: "a bass from E2 up with three notes above it",
      song: `bar meter 4/4 tempo 120bpm {
  bass: E2 1/1
  pad: [A2 C#3 E3] 1/1
}`,
      errors: ["2:9 4 notes crowd the low mids in bar 1: E2, A2, C#3, E3"],
    },
  ],
});
