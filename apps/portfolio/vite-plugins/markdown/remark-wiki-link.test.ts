import remarkParse from "remark-parse";
import { unified } from "unified";
import { expect, test } from "vite-plus/test";

import { remarkWikiLink } from "./remark-wiki-link.ts";

const processor = unified().use(remarkParse).use(remarkWikiLink);

const transformed = (markdown: string): Promise<unknown> =>
  processor.run(processor.parse(markdown));

test("Sloppedia の記事へのリンクは slug と文言を持つ WikiLink になる", () =>
  expect(transformed("前 [Piper](/sloppedia/piper) 後")).resolves.toMatchObject({
    children: [
      {
        type: "paragraph",
        children: [
          { type: "text", value: "前 " },
          {
            type: "mdxJsxTextElement",
            name: "WikiLink",
            attributes: [{ name: "slug", value: "piper" }],
            children: [{ type: "text", value: "Piper" }],
          },
          { type: "text", value: " 後" },
        ],
      },
    ],
  }));

test("# の後ろは見出しへの hash になる", () =>
  expect(transformed("[経緯](/sloppedia/piper#経緯)")).resolves.toMatchObject({
    children: [
      {
        children: [
          {
            name: "WikiLink",
            attributes: [
              { name: "slug", value: "piper" },
              { name: "hash", value: "経緯" },
            ],
          },
        ],
      },
    ],
  }));

test("ほかのリンクは書き換えない", () =>
  expect(
    transformed("[外](https://example.com/sloppedia/piper) [内](/blogs/elysia)"),
  ).resolves.toMatchObject({
    children: [
      {
        children: [
          { type: "link", url: "https://example.com/sloppedia/piper" },
          { type: "text", value: " " },
          { type: "link", url: "/blogs/elysia" },
        ],
      },
    ],
  }));
