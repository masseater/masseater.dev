import { ruleCases } from "#/shared/lib/rule-cases.test.support.ts";

import { voicingPlugin } from "./preset.ts";

ruleCases({
  plugin: voicingPlugin,
  rule: "semitone-clash",
  valid: [
    {
      name: "a melody on a chord note",
      song: `bar meter 4/4 tempo 120bpm {
  lead: rest 1/4, G4 3/4
  pad: [C4 E4 G4] 1/1
}`,
    },
    {
      name: "a close cluster voiced in one part from B3 up",
      song: `bar meter 4/4 tempo 120bpm {
  pad: [B3 C4 E4] 1/1
}`,
    },
    {
      name: "the flat 9th of a dominant seventh over its root in the bass",
      song: `bar meter 4/4 tempo 120bpm {
  bass: G2 1/1
  pad: rest 1/4, [B3 F4 Ab3] 3/4
}`,
    },
    {
      name: "notes that touch for less than a sixteenth",
      song: `bar meter 4/4 tempo 120bpm {
  lead: rest 1/4, F4 1/32, G4 23/32
  pad: [C4 E4 G4] 1/1
}`,
    },
    {
      name: "drum hits",
      song: `bar meter 4/4 tempo 120bpm {
  kit: [C2 C#2] 1/1
  pad: [C#4 E4 A4] 1/1
}`,
    },
  ],
  invalid: [
    {
      name: "a melody a minor 2nd above a held chord note",
      song: `bar meter 4/4 tempo 120bpm {
  lead: C5 1/4, F4 3/4
  pad: [C4 E4 G4] 1/1
}`,
      errors: ["2:17 F4 (lead) and E4 (pad) clash a minor 2nd apart"],
    },
    {
      name: "a melody a minor 9th above a held chord note",
      song: `bar meter 4/4 tempo 120bpm {
  lead: rest 1/4, Db5 3/4
  pad: [C4 E4 G4] 1/1
}`,
      errors: ["2:19 Db5 (lead) and C4 (pad) clash a minor 9th apart"],
    },
    {
      name: "a minor 2nd voiced in one part below B3",
      song: `bar meter 4/4 tempo 120bpm {
  pad: [A3 Bb3 D4] 1/1
}`,
      errors: ["2:12 Bb3 (pad) and A3 (pad) clash a minor 2nd apart"],
    },
    {
      name: "an upper part a minor 9th over the bass outside a dominant chord",
      song: `bar meter 4/4 tempo 120bpm {
  bass: C2 1/1
  pad: rest 1/4, [C#3 E3 A3] 3/4
}`,
      errors: ["3:19 C#3 (pad) and C2 (bass) clash a minor 9th apart"],
    },
    {
      name: "two upper parts a minor 2nd apart",
      song: `bar meter 4/4 tempo 120bpm {
  lead: E5 1/1
  counter: rest 1/2, F5 1/2
}`,
      errors: ["3:22 F5 (counter) and E5 (lead) clash a minor 2nd apart"],
    },
  ],
});
