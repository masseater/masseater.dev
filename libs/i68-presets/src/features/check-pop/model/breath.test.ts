import { Array as Arr } from "effect";

import { ruleCases } from "#/shared/lib/rule-cases.test.support.ts";

import { popPlugin } from "./preset.ts";

const QUARTERS = "C4 1/4, D4 1/4, E4 1/4, F4 1/4";

const opening = (tempo: string, track = "lead", line = QUARTERS): string =>
  `bar meter 4/4 tempo ${tempo} {\n  ${track}: ${line}\n}`;

const bar = (track = "lead", line = QUARTERS): string => `bar {\n  ${track}: ${line}\n}`;

const song = (...bars: readonly string[]): string => Arr.join(bars, "\n");

const FAST = opening("120bpm");
const SLOW = opening("60bpm");
const NEXT = bar();
const HELD = "C4 1/1";
const TIED = "C4 1/1 tie";

ruleCases({
  plugin: popPlugin,
  rule: "breath",
  valid: [
    {
      name: "exactly eight seconds of singing (four bars at 120 bpm)",
      song: song(FAST, NEXT, NEXT, NEXT),
    },
    {
      name: "a long line split by an eighth rest",
      song: song(
        FAST,
        NEXT,
        NEXT,
        bar("lead", "C4 1/4, D4 1/4, E4 1/4, rest 1/8, F4 1/8"),
        NEXT,
        NEXT,
        NEXT,
      ),
    },
    {
      name: "a held note in the harmony part",
      song: song(
        opening("120bpm", "pad", HELD),
        bar("pad", HELD),
        bar("pad", HELD),
        bar("pad", HELD),
        bar("pad", HELD),
        bar("pad", HELD),
      ),
    },
    {
      name: "two bars at 60 bpm",
      song: song(SLOW, NEXT),
    },
  ],
  invalid: [
    {
      name: "five bars without a rest at 120 bpm",
      song: song(FAST, NEXT, NEXT, NEXT, NEXT),
      errors: ["2:9 lead sings for 10.0 seconds without a rest"],
    },
    {
      name: "a sixteenth rest, too short to breathe at 120 bpm",
      song: song(FAST, NEXT, bar("lead", "C4 1/4, D4 1/4, E4 1/4, rest 1/16, F4 3/16"), NEXT, NEXT),
      errors: ["2:9 lead sings for 10.0 seconds without a rest"],
    },
    {
      name: "one note held for five bars",
      song: song(
        opening("120bpm", "lead", TIED),
        bar("lead", TIED),
        bar("lead", TIED),
        bar("lead", TIED),
        bar("lead", HELD),
      ),
      errors: ["2:9 lead sings for 10.0 seconds without a rest"],
    },
    {
      name: "three bars at 60 bpm",
      song: song(SLOW, NEXT, NEXT),
      errors: ["2:9 lead sings for 12.0 seconds without a rest"],
    },
    {
      name: "a limit lowered in the options",
      options: { seconds: 4 },
      song: song(FAST, NEXT, NEXT),
      errors: ["2:9 lead sings for 6.0 seconds without a rest"],
    },
  ],
});
