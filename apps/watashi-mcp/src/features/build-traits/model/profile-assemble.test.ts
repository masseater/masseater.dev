import { expect, it } from "@effect/vitest";
import { Array as Arr, pipe } from "effect";

import { assemble } from "./profile-assemble.ts";
import type { EditedValue, TraitInput } from "./profile-outline.ts";
import { rulesOf } from "./profile-rules.ts";

const trait = ({ ref, supports }: Readonly<{ ref: number; supports: number }>): TraitInput => ({
  ref,
  kind: "rule",
  limited: false,
  statement: `trait ${String(ref)}`,
  supports,
  contradicts: 0,
  lastSeen: "2026-11-16",
});

const ONE = 1;

const UNKNOWN = 999;

const PYTHON = 9;

const PYTHON_CI = 57;

const PYTHON_UVX = 86;

const COMMENTS = 12;

const LINKS = 40;

const JAPANESE = 70;

const TRAITS = [
  trait({ ref: PYTHON, supports: 3 }),
  trait({ ref: PYTHON_CI, supports: 2 }),
  trait({ ref: PYTHON_UVX, supports: 1 }),
  trait({ ref: COMMENTS, supports: 1 }),
  trait({ ref: LINKS, supports: 5 }),
  trait({ ref: JAPANESE, supports: 1 }),
];

const MERGED = {
  rules: [
    {
      section: "limits",
      repo: "",
      rule: "Never use Python.",
      refs: [PYTHON, PYTHON_CI, PYTHON_UVX, UNKNOWN],
    },
    { section: "work", repo: "", rule: "Never write code comments.", refs: [COMMENTS, PYTHON] },
    { section: "repo", repo: " masseater.dev ", rule: "Use embedded links.", refs: [LINKS] },
    { section: "communication", repo: "", rule: "Write in Japanese.", refs: [JAPANESE] },
  ],
} as const;

const RULES = rulesOf({ merged: MERGED, traits: TRAITS });

it("知らない参照と先に使われた参照を外し、重みを支持の数から足す", () => {
  expect(RULES).toStrictEqual([
    {
      id: 1,
      section: "limits",
      repo: "",
      rule: "Never use Python.",
      refs: [PYTHON, PYTHON_CI, PYTHON_UVX],
      weight: 6,
    },
    {
      id: 2,
      section: "work",
      repo: "",
      rule: "Never write code comments.",
      refs: [COMMENTS],
      weight: 1,
    },
    {
      id: 3,
      section: "repo",
      repo: "masseater.dev",
      rule: "Use embedded links.",
      refs: [LINKS],
      weight: 5,
    },
    {
      id: 4,
      section: "communication",
      repo: "",
      rule: "Write in Japanese.",
      refs: [JAPANESE],
      weight: 1,
    },
  ]);
});

const EDITED: EditedValue = {
  summary: ["The owner builds personal tools."],
  who: [
    { text: "The owner uses Windows.", ids: [] },
    { text: "Never use Python.", ids: ["R1"] },
  ],
  now: ["masseater.dev"],
  sections: [
    {
      section: "work",
      repo: "",
      topics: [
        { title: "Code", items: [{ text: "Never write code comments.", ids: ["R2"] }] },
        { title: "Made up", items: [{ text: "Invented rule.", ids: ["R42"] }] },
      ],
    },
    {
      section: "communication",
      repo: "",
      topics: [
        { title: "Language", items: [{ text: "Write in Japanese.", ids: ["R4"] }] },
        { title: "Reports", items: [{ text: "Keep reports short.", ids: ["R4", "R2"] }] },
      ],
    },
  ],
};

it("行の参照を規則の参照から作り、知らない規則だけの行を落とす", () => {
  const { sections } = assemble({ rules: RULES, edited: EDITED, bare: false });
  expect(sections).toContainEqual({
    title: "Who",
    lines: [{ text: "Never use Python.", refs: [PYTHON, PYTHON_CI, PYTHON_UVX] }],
    topics: [],
  });
  expect(sections).toContainEqual({
    title: "How to work with me",
    lines: [{ text: "Never write code comments.", refs: [COMMENTS] }],
    topics: [],
  });
  expect(sections).toContainEqual({
    title: "Communication",
    lines: [],
    topics: [
      { title: "Reports", lines: [{ text: "Keep reports short.", refs: [COMMENTS, JAPANESE] }] },
      { title: "Language", lines: [{ text: "Write in Japanese.", refs: [JAPANESE] }] },
    ],
  });
});

it("重い規則を編集が落としたら、その節の Other に戻す", () => {
  const assembled = assemble({ rules: RULES, edited: EDITED, bare: false });
  expect(assembled.rescued).toBe(ONE);
  expect(assembled.sections).toContainEqual({
    title: "In masseater.dev",
    lines: [{ text: "Use embedded links.", refs: [LINKS] }],
    topics: [],
  });
});

it("持ち主の事実があるときだけ、参照の無い Who の行を残す", () => {
  const { sections } = assemble({ rules: RULES, edited: EDITED, bare: true });
  expect(sections).toContainEqual({
    title: "Who",
    lines: [
      { text: "The owner uses Windows.", refs: [] },
      { text: "Never use Python.", refs: [PYTHON, PYTHON_CI, PYTHON_UVX] },
    ],
    topics: [],
  });
});

it("節を Summary、Who、Now、共通の節、リポジトリの節の順に並べる", () => {
  const { sections } = assemble({ rules: RULES, edited: EDITED, bare: false });
  expect(
    pipe(
      sections,
      Arr.map((section) => section.title),
    ),
  ).toStrictEqual([
    "Summary",
    "Who",
    "Now",
    "How to work with me",
    "Communication",
    "In masseater.dev",
  ]);
});
