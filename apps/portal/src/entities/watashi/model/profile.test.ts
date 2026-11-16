import { expect, it } from "@effect/vitest";

import { markdownOf } from "./profile.ts";

const PLAN = 26;

const WRITING = 118;

it("小見出しの行を節の行の後に ### で書く", () => {
  const markdown = markdownOf([
    { title: "Summary", lines: [{ text: "The owner builds tools.", refs: [] }] },
    {
      title: "How to work with me",
      lines: [],
      topics: [
        { title: "Process", lines: [{ text: "Show a plan first.", refs: [PLAN] }] },
        { title: "Writing", lines: [{ text: "Write plain English.", refs: [WRITING] }] },
      ],
    },
  ]);
  expect(markdown).toBe(
    "# USER.md\n\n## Summary\n- The owner builds tools.\n\n## How to work with me\n\n### Process\n- Show a plan first. [26]\n\n### Writing\n- Write plain English. [118]",
  );
});
