import { Result, String as Str, pipe } from "effect";
import { Base64 } from "effect/encoding";
import { describe, expect, it } from "vite-plus/test";
import { parse } from "yaml";

import { articleContent } from "./sloppedia-markdown";

const decode = (content: string): string => Result.getOrThrow(Base64.decodeString(content));

describe("articleContent", () => {
  it("frontmatter を YAML として読み戻すと入力と同じになる", () => {
    const text = decode(
      articleContent({
        slug: "web-dev",
        title: " Web 開発 ",
        description: "Web の「開発」: 説明である。",
        body: "Web 開発は、Web の開発である。\n",
        tags: ["技術"],
        infobox: [{ label: "公開", value: "2026年", href: "https://example.com" }],
      }),
    );
    const [, yaml = "", body = ""] = pipe(text, Str.split("---\n"));
    expect(parse(yaml)).toStrictEqual({
      title: "Web 開発",
      description: "Web の「開発」: 説明である。",
      tags: ["技術"],
      published: true,
      infobox: [{ label: "公開", value: "2026年", href: "https://example.com" }],
    });
    expect(body).toBe("\nWeb 開発は、Web の開発である。\n");
  });
});
