import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect } from "effect";

import { linesOf, song, titled } from "./lint.test.support.ts";

const HIGH = "warn range/too-high lead is too high [Move it down an octave]";
const AT_8 = `/song.fumx:8:9 ${HIGH}`;
const AT_9 = `/song.fumx:9:9 ${HIGH}`;
const AT_10 = `/song.fumx:10:9 ${HIGH}`;
const LOW_AT_9 = "/song.fumx:9:17 warn range/too-low lead is too low";

const NOTE = "  lead: D6 1/1";
const BOTH = "  lead: D6 1/2, C2 1/2";

interface Case {
  readonly name: string;
  readonly text: string;
  readonly found: readonly string[];
}

const onNote = (comment: string): string => song(`${NOTE} ${comment}`);
const beforeNote = (...comments: readonly string[]): string =>
  song(Arr.join([...comments, NOTE], "\n"));
const atTop = (comments: readonly string[], body = NOTE): string =>
  `${Arr.join(comments, "\n")}\n${song(body)}`;

const SAME_LINE: readonly Case[] = [
  { name: "i68-ignore without rule names", text: onNote("// i68-ignore"), found: [] },
  {
    name: "i68-ignore naming the rule",
    text: onNote("// i68-ignore range/too-high"),
    found: [],
  },
  {
    name: "i68-ignore naming only another rule",
    text: onNote("// i68-ignore range/too-low"),
    found: [AT_8],
  },
  {
    name: "i68-ignore with rules separated by a comma and a space",
    text: onNote("// i68-ignore range/too-low, range/too-high"),
    found: [],
  },
  {
    name: "i68-ignore with rules separated by a comma alone",
    text: onNote("// i68-ignore range/too-low,range/too-high"),
    found: [],
  },
  {
    name: "i68-ignore with names separated only by a space, which read as one name",
    text: onNote("// i68-ignore range/too-low range/too-high"),
    found: [AT_8],
  },
  {
    name: "i68-ignore with a reason",
    text: onNote("// i68-ignore range/too-high -- the climax"),
    found: [],
  },
  {
    name: "i68-ignore whose reason mentions a rule, which is not a rule name",
    text: onNote("// i68-ignore -- range/too-low"),
    found: [],
  },
  {
    name: "i68-ignore naming the rule only in its reason",
    text: onNote("// i68-ignore range/too-low -- range/too-high"),
    found: [AT_8],
  },
  {
    name: "i68-ignore with a reason after three dashes",
    text: onNote("// i68-ignore range/too-high --- the climax"),
    found: [],
  },
  {
    name: "i68-ignore with no space after the slashes",
    text: onNote("//i68-ignore range/too-high"),
    found: [],
  },
  {
    name: "i68-ignore in a block comment",
    text: onNote("/* i68-ignore range/too-high */"),
    found: [],
  },
  {
    name: "i68-ignore on the line before, which covers only its own line",
    text: beforeNote("  // i68-ignore"),
    found: [AT_9],
  },
  { name: "text before the directive", text: onNote("// see i68-ignore"), found: [AT_8] },
  {
    name: "a directive glued to a rule name",
    text: onNote("// i68-ignorerange/too-high"),
    found: [AT_8],
  },
  {
    name: "a longer word that starts like a directive",
    text: onNote("// i68-ignored"),
    found: [AT_8],
  },
  { name: "a directive in capitals", text: onNote("// I68-IGNORE"), found: [AT_8] },
  {
    name: "a directive inside a string",
    text: titled("// i68-ignore-file")(NOTE),
    found: [AT_8],
  },
];

const NEXT_LINE: readonly Case[] = [
  { name: "i68-ignore-next-line", text: beforeNote("  // i68-ignore-next-line"), found: [] },
  {
    name: "i68-ignore-next-line naming only another rule",
    text: beforeNote("  // i68-ignore-next-line range/too-low"),
    found: [AT_9],
  },
  {
    name: "i68-ignore-next-line two lines above the note",
    text: beforeNote("  // i68-ignore-next-line", ""),
    found: [AT_10],
  },
  {
    name: "i68-ignore-next-line on the note's own line",
    text: onNote("// i68-ignore-next-line"),
    found: [AT_8],
  },
  {
    name: "i68-ignore-next-line in a block comment",
    text: beforeNote("  /* i68-ignore-next-line range/too-high */"),
    found: [],
  },
  {
    name: "i68-ignore-next-line with a reason",
    text: beforeNote("  // i68-ignore-next-line range/too-high -- the climax"),
    found: [],
  },
];

const FILE: readonly Case[] = [
  { name: "i68-ignore-file", text: atTop(["// i68-ignore-file"]), found: [] },
  {
    name: "i68-ignore-file naming only another rule",
    text: atTop(["// i68-ignore-file range/too-low"]),
    found: [AT_9],
  },
  {
    name: "i68-ignore-file at the end of the file",
    text: `${song(NOTE)}// i68-ignore-file range/too-high\n`,
    found: [],
  },
  { name: "i68-ignore-file in a block comment", text: atTop(["/* i68-ignore-file */"]), found: [] },
];

const RANGE: readonly Case[] = [
  { name: "i68-disable without rule names", text: atTop(["// i68-disable"]), found: [] },
  {
    name: "i68-disable naming the rule",
    text: atTop(["// i68-disable range/too-high"]),
    found: [],
  },
  {
    name: "i68-disable naming only another rule",
    text: atTop(["// i68-disable range/too-low"]),
    found: [AT_9],
  },
  {
    name: "i68-disable after the note",
    text: song(`${NOTE}\n  // i68-disable`),
    found: [AT_8],
  },
  {
    name: "i68-disable after the note on the same line",
    text: onNote("// i68-disable"),
    found: [AT_8],
  },
  {
    name: "i68-enable naming the rule",
    text: atTop(["// i68-disable range/too-high", "// i68-enable range/too-high"]),
    found: [AT_10],
  },
  {
    name: "i68-enable without rule names after a named i68-disable",
    text: atTop(["// i68-disable range/too-high", "// i68-enable"]),
    found: [AT_10],
  },
  {
    name: "i68-enable of one rule after i68-disable of every rule",
    text: atTop(["// i68-disable", "// i68-enable range/too-high"], BOTH),
    found: [`/song.fumx:10:9 ${HIGH}`],
  },
  {
    name: "i68-enable without an i68-disable",
    text: atTop(["// i68-enable"]),
    found: [AT_9],
  },
  {
    name: "i68-disable again after an i68-enable",
    text: atTop(["// i68-disable", "// i68-enable", "// i68-disable range/too-high"]),
    found: [],
  },
  {
    name: "i68-disable in a block comment",
    text: atTop(["/* i68-disable range/too-high */"]),
    found: [],
  },
  {
    name: "i68-disable with a reason",
    text: atTop(["// i68-disable range/too-high -- the chorus jumps on purpose"]),
    found: [],
  },
  {
    name: "i68-disable of one rule, which leaves the other rules on",
    text: atTop(["// i68-disable range/too-high"], BOTH),
    found: [LOW_AT_9],
  },
];

for (const testCase of [...SAME_LINE, ...NEXT_LINE, ...FILE, ...RANGE]) {
  it.effect(`follows ${testCase.name}`, () =>
    Effect.map(linesOf(testCase.text), (found) => {
      expect(found).toStrictEqual(testCase.found);
    }),
  );
}
