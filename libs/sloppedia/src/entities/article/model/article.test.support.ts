import { defineSloppedia, githubSource } from "#/shared/config/index.ts";

import type { Article } from "./article.ts";
import type { Heading } from "./headings.ts";

export const config = defineSloppedia({
  name: "Testpedia",
  tagline: "試しの百科事典",
  basePath: "/wiki",
  home: { label: "トップ", href: "/" },
  ...githubSource({ repository: "https://github.com/example/site", directory: "content" }),
});

export const BODY = "本文";

export const NO_HEADINGS: readonly Heading[] = [];

export const article: Article = {
  slug: "hello",
  title: "ハロー",
  description: "挨拶",
  date: "2026-01-01",
  updated: "2026-01-02",
  tags: ["挨拶"],
  infobox: [{ label: "種類", value: "挨拶" }],
};

export const ARTICLES: readonly Article[] = [article];
