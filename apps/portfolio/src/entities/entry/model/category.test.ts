import { expect, test } from "vite-plus/test";

import { isUnindexedPath } from "./category";

test.each([
  "/sloppedia",
  "/sloppedia/piper",
  "/sloppedia/piper/history",
  "/og/sloppedia",
  "/og/sloppedia/piper.png",
])("%s は検索に載せない", (path) => {
  expect(isUnindexedPath(path)).toBe(true);
});

test.each([
  "/",
  "/blogs",
  "/blogs/piper",
  "/blogs/sloppedia",
  "/og/blogs/piper.png",
  "/projects",
  "/sloppedia-x",
  "/sloppedia-x/piper",
  "/og/sloppedia-x.png",
  "/og",
])("%s は検索に載せる", (path) => {
  expect(isUnindexedPath(path)).toBe(false);
});
