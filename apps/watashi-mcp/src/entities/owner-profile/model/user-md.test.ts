import { expect, it } from "@effect/vitest";
import { Array as Arr, Option, pipe } from "effect";

import { inScope, isUserMd, parseUserMd, renderUserMd } from "./user-md";

const DOCUMENT = Arr.join(
  [
    "# USER.md",
    "",
    "## Who",
    "- The owner lives in Japan.",
    "## Hard limits",
    "- Never use Python. [57 86, 9]",
    "## How to work with me",
    "- Always fix the root cause. [64]",
    "## Communication",
    "- Always write in Japanese. [62]",
    "## In masseater.dev",
    "- Always use embedded links. [111]",
  ],
  "\n",
);

it("見出しと箇条書きと行末の参照番号を読み取る", () => {
  const sections = parseUserMd(DOCUMENT);
  expect(Arr.map(sections, (section) => section.title)).toStrictEqual([
    "Who",
    "Hard limits",
    "How to work with me",
    "Communication",
    "In masseater.dev",
  ]);
  expect(sections[1]?.lines).toStrictEqual([{ text: "Never use Python.", refs: [57, 86, 9] }]);
  expect(isUserMd(sections)).toBe(true);
});

it("書き戻すと同じ節と行になる", () => {
  const sections = parseUserMd(DOCUMENT);
  expect(parseUserMd(renderUserMd(sections))).toStrictEqual(sections);
});

it("scope を渡さなければ In の節を外し、渡せばその節だけを残す", () => {
  const sections = parseUserMd(DOCUMENT);
  const titlesIn = (scope: Option.Option<string>): readonly string[] =>
    pipe(
      sections,
      Arr.filter(inScope(scope)),
      Arr.map((section) => section.title),
    );
  expect(titlesIn(Option.none())).not.toContain("In masseater.dev");
  expect(titlesIn(Option.some("MASSEATER.DEV"))).toContain("In masseater.dev");
});

it("必要な節が無い文書は USER.md と認めない", () => {
  expect(isUserMd(parseUserMd("# USER.md\n\n## Who\n- someone"))).toBe(false);
});
