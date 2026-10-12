import { Effect } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { allEntries } from "./entries";

describe("allEntries", () => {
  test("content の frontmatter がすべてスキーマを満たす", () =>
    expect(Effect.runPromise(allEntries)).resolves.toBeInstanceOf(Array));
});
