import { Array as Arr, Effect, pipe } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { entryOf } from "#/entities/entry/index.ts";

import { projects } from "./projects.ts";

const blogSlugs = pipe(
  projects,
  Arr.flatMap(({ blogs }) => blogs),
  Arr.map(({ slug }) => slug),
);

describe("projects", () => {
  test.each(blogSlugs)("ブログ %s が公開されている", (slug) =>
    expect(Effect.runPromise(entryOf({ category: "blogs", slug }))).resolves.toMatchObject({
      status: "found",
      entry: { status: "published" },
    }),
  );
});
