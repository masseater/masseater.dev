import { expect, it } from "@effect/vitest";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { inScope, isUserMd, parseUserMd, renderUserMd } from "./user-md.ts";

const REFS = "57 86, 9";

const DOCUMENT = Arr.join(
  [
    "# USER.md",
    "",
    "## Who",
    "- The owner lives in Japan.",
    "## Hard limits",
    `- Never use Python. [${REFS}]`,
    "## How to work with me",
    "- Always fix the root cause. [64]",
    "## Communication",
    "- Always write in Japanese. [62]",
    "## In masseater.dev",
    "- Always use embedded links. [111]",
  ],
  "\n",
);

const PYTHON = {
  text: "Never use Python.",
  refs: pipe(REFS, Str.split(/[ ,]+/u), Arr.map(Number)),
};

const titleOf = (section: Readonly<{ title: string }>): string => section.title;

it("見出しと箇条書きと行末の参照番号を読み取る", () => {
  const sections = parseUserMd(DOCUMENT);
  expect(pipe(sections, Arr.map(titleOf))).toStrictEqual([
    "Who",
    "Hard limits",
    "How to work with me",
    "Communication",
    "In masseater.dev",
  ]);
  expect(sections).toContainEqual({ title: "Hard limits", lines: [PYTHON] });
  expect(isUserMd(sections)).toBe(true);
});

it("書き戻すと同じ節と行になる", () => {
  const sections = parseUserMd(DOCUMENT);
  expect(parseUserMd(renderUserMd(sections))).toStrictEqual(sections);
});

it("scope を渡さなければ In の節を外し、渡せばその節だけを残す", () => {
  const sections = parseUserMd(DOCUMENT);
  const titlesIn = (scope: Option.Option<string>): readonly string[] =>
    pipe(sections, Arr.filter(inScope(scope)), Arr.map(titleOf));
  expect(titlesIn(Option.none())).not.toContain("In masseater.dev");
  expect(titlesIn(Option.some("MASSEATER.DEV"))).toContain("In masseater.dev");
});

it("必要な節が無い文書は USER.md と認めない", () => {
  expect(isUserMd(parseUserMd("# USER.md\n\n## Who\n- someone"))).toBe(false);
});
