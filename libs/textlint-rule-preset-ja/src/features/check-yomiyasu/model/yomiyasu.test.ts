import { Array as Arr } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { findingsOf } from "./yomiyasu.ts";

const LIST_ITEMS = 20;
const LISTED = Arr.join(
  Arr.makeBy(
    LIST_ITEMS,
    (index) => `- 項目${index}について、手元で動かすための設定を一つずつ書いておく`,
  ),
  "\n",
);
const rulesOf = (filePath: string): readonly string[] =>
  Arr.map(findingsOf(filePath)(`# 手順\n\n${LISTED}\n`), (finding) => finding.rule);

describe("findingsOf", () => {
  test.each(["README.md", "apps/web/README.md", "docs/readme.ja.md"])(
    "treats %s as a manual",
    (filePath) => {
      expect(rulesOf(filePath)).not.toContain("excess_list");
    },
  );

  test.each(["docs/design.md", "AGENTS.md", ""])("keeps excess_list for %s", (filePath) => {
    expect(rulesOf(filePath)).toContain("excess_list");
  });
});
