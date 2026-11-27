import { Option } from "effect";
import { expect, test } from "vite-plus/test";

import { movedDocumentPath } from "./standard-site-paths.ts";

const SLUGS = ["piper"];

test("a blog path of a post that now lives in Slog moves to /slog", () => {
  expect(movedDocumentPath({ slugs: SLUGS, path: "/blogs/piper" })).toStrictEqual(
    Option.some("/slog/piper"),
  );
});

test("a post the owner wrote by hand stays under /blogs", () => {
  expect(movedDocumentPath({ slugs: SLUGS, path: "/blogs/by-hand" })).toStrictEqual(Option.none());
});

test("a document that already moved is left alone", () => {
  expect(movedDocumentPath({ slugs: SLUGS, path: "/slog/piper" })).toStrictEqual(Option.none());
});
