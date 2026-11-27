import { expect, test } from "vite-plus/test";

import { movedSlugs, redirectLines } from "./asset-redirects.ts";

test("moved posts redirect permanently, including their OG images", () => {
  expect(redirectLines(["piper"])).toStrictEqual([
    "/blogs/piper /slog/piper 301",
    "/og/blogs/piper.png /og/slog/piper.png 301",
  ]);
});

test("a slug that is still a blog post is not redirected", () => {
  expect(
    movedSlugs({ slog: ["b.md", "a.md", "kept.md"], blogs: ["kept.md", ".gitkeep"] }),
  ).toStrictEqual(["a", "b"]);
});
