import { ruleCases } from "#/shared/lib/rule-cases.ts";

import { voicingPlugin } from "./preset.ts";

ruleCases({
  plugin: voicingPlugin,
  rule: "voice-jump",
  valid: [
    {
      name: "I to IV keeping the shared note",
      song: `bar meter 4/4 tempo 120bpm {
  pad: [C4 E4 G4] 1/1
}
bar {
  pad: [C4 F4 A4] 1/1
}`,
    },
    {
      name: "a chord moving up a step in every voice",
      song: `bar meter 4/4 tempo 120bpm {
  pad: [C4 E4 G4] 1/1
}
bar {
  pad: [D4 F4 A4] 1/1
}`,
    },
    {
      name: "a new voicing after two bars of rest",
      song: `bar meter 4/4 tempo 120bpm {
  pad: [C3 E3 G3] 1/1
}
bar {
  pad: rest 1/1
}
bar {
  pad: rest 1/1
}
bar {
  pad: [C5 E5 G5] 1/1
}`,
    },
    {
      name: "two-note shapes",
      song: `bar meter 4/4 tempo 120bpm {
  pad: [C3 G3] 1/1
}
bar {
  pad: [C5 G5] 1/1
}`,
    },
  ],
  invalid: [
    {
      name: "the same chord an octave higher",
      song: `bar meter 4/4 tempo 120bpm {
  pad: [C3 E3 G3] 1/1
}
bar {
  pad: [C4 E4 G4] 1/1
}`,
      errors: ["5:9 3 voices of pad leap more than 4 semitones into the next chord"],
    },
    {
      name: "the same chord an octave higher with a wider limit",
      options: { max: 7 },
      song: `bar meter 4/4 tempo 120bpm {
  pad: [C3 E3 G3] 1/1
}
bar {
  pad: [C4 E4 G4] 1/1
}`,
      errors: ["5:9 2 voices of pad leap more than 7 semitones into the next chord"],
    },
  ],
});
