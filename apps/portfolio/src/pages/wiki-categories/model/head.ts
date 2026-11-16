import { sectionPath } from "#/shared/config/index.ts";
import { defaultImage, seo, wikiPageTitle } from "#/shared/lib/index.ts";
import type { Head } from "#/shared/lib/index.ts";
import { wiki } from "#/shared/wiki/index.ts";

export const categoriesHead: Head = seo({
  title: wikiPageTitle(wiki.labels.categories),
  description: "Sloppedia の記事をカテゴリごとに並べた一覧",
  path: `${sectionPath("sloppedia")}/categories`,
  type: "website",
  image: defaultImage,
  extra: [],
  structuredData: [],
});
