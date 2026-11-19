import { Record as Rec } from "effect";

import { chordBars, ruleCases } from "#/shared/lib/rule-cases.test.support.ts";
import type { StyleTable } from "#/shared/lib/style-table.ts";

import { bachPlugin, stylePluginOf } from "./preset.ts";

const USUAL = 9;
const RARE = 1;
const ALWAYS = 10;
const FEW = 2;

const TABLE: StyleTable = {
  name: "test style",
  source: "test",
  order: 2,
  transitions: Rec.fromEntries([
    [
      "I",
      Rec.fromEntries([
        ["IV", USUAL],
        ["V", RARE],
      ]),
    ],
    ["IV", Rec.fromEntries([["V", ALWAYS]])],
    ["V I", Rec.fromEntries([["IV", FEW]])],
  ]),
};

const LIMITS = { share: 0.2, seen: 5 };

ruleCases({
  plugin: stylePluginOf(TABLE),
  rule: "rare-transition",
  valid: [
    { name: "changes the style makes often", options: LIMITS, song: chordBars(["C", "F", "G"]) },
    {
      name: "a chord after a context the style has never seen",
      options: LIMITS,
      song: chordBars(["Am", "Dm", "Em", "Am"]),
    },
  ],
  invalid: [
    {
      name: "a change the style rarely makes",
      options: LIMITS,
      song: chordBars(["C", "G", "C", "F"]),
      errors: ["6:9 I → V is rare in test style (10%)"],
    },
    {
      name: "a change the style never makes",
      options: LIMITS,
      song: chordBars(["C", "Am", "F", "G", "C"]),
      errors: ["6:9 I → VIm is rare in test style (0%)"],
    },
    {
      name: "a change judged by the shorter context when the longer one is seen too rarely",
      options: LIMITS,
      song: chordBars(["F", "G", "C", "G", "C", "F"]),
      errors: ["14:9 I → V is rare in test style (10%)"],
    },
  ],
});

ruleCases({
  plugin: bachPlugin,
  rule: "rare-transition",
  valid: [
    { name: "an authentic cadence", song: chordBars(["C", "F", "G", "C"]) },
    { name: "a ii–V–I", song: chordBars(["C", "Dm", "G7", "C"]) },
  ],
  invalid: [
    {
      name: "a dominant seventh that falls back to ii, which Bach never wrote after I–V7",
      song: chordBars(["C", "F", "G", "C", "G7", "Dm"]),
      errors: ["22:9 V I V7 → IIm is rare in Bach chorales (0%)"],
    },
  ],
});
