import { Effect } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { allEntries } from "./entries";

const NONE = 0;

describe("allEntries", () => {
  test("content の frontmatter がすべてスキーマを満たす", () =>
    expect(Effect.runPromise(allEntries)).resolves.not.toHaveLength(NONE));
});
