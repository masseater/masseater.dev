import { ruleCases } from "#/shared/lib/rule-cases.ts";

import { popPlugin } from "./preset.ts";

ruleCases({
  plugin: popPlugin,
  rule: "melody-leap",
  valid: [
    {
      name: "a leap of exactly an octave",
      song: `bar meter 4/4 tempo 120bpm {
  lead: C4 1/2, C5 1/2
}`,
    },
    {
      name: "wide leaps in the bass and harmony parts",
      song: `bar meter 4/4 tempo 120bpm {
  pad: C3 1/2, E5 1/2
  bass: C1 1/2, G3 1/2
}`,
    },
    {
      name: "a new phrase after a whole bar of rest",
      song: `bar meter 4/4 tempo 120bpm {
  lead: C4 1/1
}
bar {
  lead: rest 1/1
}
bar {
  lead: E5 1/1
}`,
    },
    {
      name: "two melodic parts far apart from each other",
      song: `bar meter 4/4 tempo 120bpm {
  lead: C4 1/1
  counter: G5 1/1
}`,
    },
    {
      name: "a leap within the limit that the options raise",
      options: { max: 16 },
      song: `bar meter 4/4 tempo 120bpm {
  lead: C4 1/2, E5 1/2
}`,
    },
  ],
  invalid: [
    {
      name: "an upward leap of a ninth",
      song: `bar meter 4/4 tempo 120bpm {
  lead: C4 1/2, D5 1/2
}`,
      errors: ["2:17 lead leaps 14 semitones from C4 to D5"],
    },
    {
      name: "a downward leap of a tenth across the bar line",
      song: `bar meter 4/4 tempo 120bpm {
  lead: C4 1/2, E5 1/2
}
bar {
  lead: C4 1/1
}`,
      errors: [
        "2:17 lead leaps 16 semitones from C4 to E5",
        "5:9 lead leaps 16 semitones from E5 to C4",
      ],
    },
    {
      name: "a leap across a short rest",
      song: `bar meter 4/4 tempo 120bpm {
  lead: C4 1/4, rest 1/2, D5 1/4
}`,
      errors: ["2:27 lead leaps 14 semitones from C4 to D5"],
    },
    {
      name: "a leap from the top note of a chord in the melody",
      song: `bar meter 4/4 tempo 120bpm {
  lead: [C4 E4] 1/2, G5 1/2
}`,
      errors: ["2:22 lead leaps 15 semitones from E4 to G5"],
    },
    {
      name: "a countermelody leap",
      song: `bar meter 4/4 tempo 120bpm {
  counter: G3 1/2, C5 1/2
}`,
      errors: ["2:20 counter leaps 17 semitones from G3 to C5"],
    },
    {
      name: "a leap over the limit that the options lower",
      options: { max: 7 },
      song: `bar meter 4/4 tempo 120bpm {
  lead: C4 1/2, A4 1/2
}`,
      errors: ["2:17 lead leaps 9 semitones from C4 to A4"],
    },
  ],
});
