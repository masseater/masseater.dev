import { ruleCases } from "#/shared/lib/rule-cases.ts";

import { voicingPlugin } from "./preset.ts";

ruleCases({
  plugin: voicingPlugin,
  rule: "low-interval-limit",
  valid: [
    {
      name: "a minor 3rd on its limit C3",
      song: `bar meter 4/4 tempo 120bpm {
  pad: [C3 Eb3] 1/1
}`,
    },
    {
      name: "a perfect 5th on its limit Bb1",
      song: `bar meter 4/4 tempo 120bpm {
  pad: [Bb1 F2] 1/1
}`,
    },
    {
      name: "an octave in the lowest register",
      song: `bar meter 4/4 tempo 120bpm {
  bass: [C1 C2] 1/1
}`,
    },
    {
      name: "a major 3rd on its limit Bb2",
      song: `bar meter 4/4 tempo 120bpm {
  pad: [Bb2 D3] 1/1
}`,
    },
    {
      name: "a minor 9th on its limit E2",
      song: `bar meter 4/4 tempo 120bpm {
  pad: [E2 F3] 1/1
}`,
    },
  ],
  invalid: [
    {
      name: "a minor 3rd below C3",
      song: `bar meter 4/4 tempo 120bpm {
  pad: [B2 D3] 1/1
}`,
      errors: ["2:12 3 semitones between B2 (pad) and D3 (pad) is below its limit C3"],
    },
    {
      name: "a perfect 5th below Bb1",
      song: `bar meter 4/4 tempo 120bpm {
  pad: [A1 E2] 1/1
}`,
      errors: ["2:12 7 semitones between A1 (pad) and E2 (pad) is below its limit Bb1"],
    },
    {
      name: "a major 3rd below Bb2",
      song: `bar meter 4/4 tempo 120bpm {
  pad: [A2 C#3] 1/1
}`,
      errors: ["2:12 4 semitones between A2 (pad) and C#3 (pad) is below its limit Bb2"],
    },
    {
      name: "a minor 9th below E2",
      song: `bar meter 4/4 tempo 120bpm {
  pad: [Eb2 E3] 1/1
}`,
      errors: ["2:13 13 semitones between Eb2 (pad) and E3 (pad) is below its limit E2"],
    },
    {
      name: "a major 9th below Eb2",
      song: `bar meter 4/4 tempo 120bpm {
  pad: [D2 E3] 1/1
}`,
      errors: ["2:12 14 semitones between D2 (pad) and E3 (pad) is below its limit Eb2"],
    },
    {
      name: "a bass and a part entering a major 2nd above it",
      song: `bar meter 4/4 tempo 120bpm {
  bass: C3 1/1
  pad: rest 1/2, D3 1/2
}`,
      errors: ["3:18 2 semitones between C3 (bass) and D3 (pad) is below its limit Eb3"],
    },
  ],
});
